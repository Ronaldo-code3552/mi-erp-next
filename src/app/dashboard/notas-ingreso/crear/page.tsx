// src/app/dashboard/notas-ingreso/crear/page.tsx
"use client";
import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { format, addMonths } from 'date-fns';

// Servicios y Tipos
import { notaIngresoService } from '@/services/notaIngresoService';
import { productoService } from '@/services/productoService';
import { presentacionService } from '@/services/presentacionService'; 
import { almacenLoteService } from '@/services/almacenLoteService'; 
import { useCatalogs } from '@/hooks/useCatalogs'; 
import { NotaIngresoPayload, NotaIngresoDetalle } from '@/types/notaIngreso.types';

// Componentes UI
import SearchableSelect from '@/components/forms/SearchableSelect';
import ImportarDocumentoModal from '@/components/forms/ImportarDocumentoModal';
import Modal from '@/components/ui/Modal'; 
import { 
    IconDeviceFloppy, IconArrowLeft, IconFileDescription, 
    IconBuildingStore, IconPackage, IconPlus, IconTrash, IconSearch,
    IconLoader, IconEraser, IconEye,
    IconX
} from '@tabler/icons-react';

const SectionTitle = ({ title, icon: Icon }: any) => (
    <div className="flex items-center gap-2 text-slate-800 border-b border-slate-200 pb-2 mb-4 mt-6">
        <Icon className="text-blue-600" size={20} />
        <h3 className="font-bold text-sm uppercase tracking-wide">{title}</h3>
    </div>
);

const FormInput = ({ label, className, disabled, value, ...props }: any) => (
    <div className="flex flex-col gap-1.5 w-full">
        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">{label}</label>
        <input 
            disabled={disabled}
            className={`w-full border p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all text-xs 
                ${disabled ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed font-bold' : 'border-slate-200 bg-white'} 
                ${className || ''}`}
            value={value !== undefined && value !== null ? value : ''} 
            {...props}
        />
    </div>
);

interface InternalNotaIngresoDetalle extends NotaIngresoDetalle {
    saldoMaximo?: number;
}

export default function CrearNotaIngresoPage() {
    const router = useRouter();
    
    const EMPRESA_ID = "005";
    const USER_ID = "CU0001";     
    const USER_NAME = "BIOSNET";  
    const TENANT_ID = 1;

    const todayStr = format(new Date(), 'yyyy-MM-dd');

    const [loading, setLoading] = useState(false);
    
    const [formData, setFormData] = useState<Partial<NotaIngresoPayload>>({
        empresaId: EMPRESA_ID, 
        almacenId: '',
        cuentausuario: USER_ID, 
        estado: 'REGISTRADO',
        fecha_doc: todayStr, 
        transaccionId: '', 
        tipodoccomercialId: '', 
        doc_referencia: '', 
        doc_referencia_numero: '', 
        proveedorId: '', 
        monedaId: '001', 
        tipo_cambio: 1.0, 
        nro_contenedor: '',
        observaciones: '' 
    });

    const [items, setItems] = useState<InternalNotaIngresoDetalle[]>([]);

    const [showLoteModal, setShowLoteModal] = useState(false);
    const [activeLoteItemIndex, setActiveLoteItemIndex] = useState<number | null>(null);
    const [lotesDisponibles, setLotesDisponibles] = useState<any[]>([]);
    const [loadingLotes, setLoadingLotes] = useState(false);
    
    const [proveedorNombreImportado, setProveedorNombreImportado] = useState<string>('');
    const [docReferenciaVisible, setDocReferenciaVisible] = useState<string>('');

    const [loteSearchTerm, setLoteSearchTerm] = useState('');
    const loteSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const [isImportModalOpen, setIsImportModalOpen] = useState(false);

    const [showCreateLote, setShowCreateLote] = useState(false);
    const [creatingLote, setCreatingLote] = useState(false);
    const [newLoteForm, setNewLoteForm] = useState({
        descripcion: '',
        fecha_produccion: todayStr,
        fecha_vencimiento: format(addMonths(new Date(), 12), 'yyyy-MM-dd'),
        fecha_alerta: format(addMonths(new Date(), 10), 'yyyy-MM-dd'),
        codigo_lote_importacion: ''
    });

    const [detailLoteModalOpen, setDetailLoteModalOpen] = useState(false);
    const [selectedLoteData, setSelectedLoteData] = useState<any | null>(null);

    const { catalogs, loadingCatalogs } = useCatalogs([
        'Moneda',
        { endpoint: 'Almacen', params: { empresaId: EMPRESA_ID } },
        'TipoDocumentoComercial', 
        'MotivoTraslado', 
        ...(formData.almacenId
            ? [{ endpoint: 'TablaTransaccionesPerfil', params: { cuentausuarioId: USER_NAME, almacenId: formData.almacenId } }]
            : [])
    ]);

    const almacenOrigenOptions = useMemo(() => {
        return (catalogs['Almacen'] || []).filter((a: any) => {
            const estado = a?.originalData?.estado ?? a?.estado;
            return estado === true || estado === 1 || estado === '1';
        });
    }, [catalogs]);

    const transaccionRules = useMemo(() => {
        const t = formData.transaccionId;
        
        const motivos = catalogs['MotivoTraslado'] || [];
        const idTraslado = motivos.find((m: any) => String(m.label).toUpperCase().includes('TRASLADO ENTRE ESTABLECIMIENTO'))?.value;

        return {
            requireCosto: t === 'IN', 
            allowImportDocs: ['CI', 'CL', 'TA', 'DV'].includes(t || ''), 
            
            // 🚀 REGLA EXACTA PARA DEVOLUCIÓN DE VENTAS (DV)
            allowedDocTypes: 
                t === 'TA' ? ['X031', 'X029'] :                  
                t === 'DV' ? ['X037', 'X077'] :  // X037 y X077 permitidos
                ['CI', 'CL'].includes(t || '') ? ['X034', 'X061', 'X062', 'X029', 'X067'] : 
                [],
            
            tipoCompraFiltro: 
                t === 'CI' ? 'IMPORTACION' : 
                t === 'CL' ? 'COMPRA NACIONAL' : 
                null,

            filtrosGuia: t === 'TA' ? {
                estados_excluidos: ['COMPROMETIDO', 'ANULADO'],
                motivoTasladoJson: idTraslado ? [idTraslado] : [],
                estadoJson: ['PENDIENTE'],
                AlmacenDestinoJson: formData.almacenId ? [formData.almacenId] : []
            } : null,

            // 🚀 FILTROS PARA NOTAS DE CRÉDITO (DV) - Se envían internamente en C# pero aquí lo dejamos listo
            filtrosVenta: t === 'DV' ? {
                estados_excluidos: ['COMPROMETIDO', 'ANULADO'], 
                motivoelectronicoId: ['01', '02', '06', '07']
            } : null
        };
    }, [formData.almacenId, formData.transaccionId, catalogs]);

    const isImportedData = !!formData.doc_referencia_numero;
    const importedEntityLabel = formData.transaccionId === 'DV' ? 'Cliente' : 'Proveedor';

    const transaccionOptions = useMemo(() => {
        let opciones = catalogs['TablaTransaccionesPerfil'] || [];
        opciones = opciones.filter((t: any) => t.originalData?.tipomovimientoId === "I");

        const almacenActual = (catalogs['Almacen'] || []).find((a: any) => String(a.value).trim() === String(formData.almacenId || '').trim());
        const tipoAlmacen = String(almacenActual?.originalData?.tipoalmacenId || almacenActual?.originalData?.tipoAlmacen?.tipoAlmacenId || '3');

        if (tipoAlmacen === "5") opciones = opciones.filter((t: any) => t.value === "NINGUNA");

        const transaccionesExcluidas = ["DC", "CC", "IA", "SX"];
        opciones = opciones.filter((t: any) => !transaccionesExcluidas.includes(t.value));

        return opciones;
    }, [catalogs, formData.almacenId]);

    const handleChange = (e: any) => {
        const { name, value } = e.target;
        if (name === 'almacenId') {
            setFormData({
                empresaId: EMPRESA_ID,
                almacenId: value,
                cuentausuario: USER_ID,
                estado: 'REGISTRADO',
                fecha_doc: todayStr,
                transaccionId: '',
                tipodoccomercialId: '',
                doc_referencia: '',
                doc_referencia_numero: '',
                proveedorId: '',
                monedaId: '001',
                tipo_cambio: 1.0,
                nro_contenedor: '',
                observaciones: ''
            });
            setItems([]);
            setShowLoteModal(false);
            setActiveLoteItemIndex(null);
            setLotesDisponibles([]);
            setLoteSearchTerm('');
            setShowCreateLote(false);
            setProveedorNombreImportado('');
            setDocReferenciaVisible('');
            setIsImportModalOpen(false);
            return;
        }
        if (name === 'transaccionId') {
            setFormData({
                empresaId: EMPRESA_ID,
                almacenId: formData.almacenId || '',
                cuentausuario: USER_ID,
                estado: 'REGISTRADO',
                fecha_doc: todayStr,
                transaccionId: value,
                tipodoccomercialId: '',
                doc_referencia: '',
                doc_referencia_numero: '',
                proveedorId: '',
                monedaId: '001',
                tipo_cambio: 1.0,
                nro_contenedor: '',
                observaciones: ''
            });
            setItems([]);
            setProveedorNombreImportado('');
            setDocReferenciaVisible('');
            setIsImportModalOpen(false);
            return;
        }

        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleClearForm = () => {
        setFormData({
            empresaId: EMPRESA_ID, almacenId: formData.almacenId || '', cuentausuario: USER_ID, estado: 'REGISTRADO',
            fecha_doc: todayStr, transaccionId: '', tipodoccomercialId: '', doc_referencia: '', doc_referencia_numero: '', 
            proveedorId: '', monedaId: '001', tipo_cambio: 1.0, nro_contenedor: '', observaciones: '' 
        });
        setItems([]);
        setShowLoteModal(false);
        setActiveLoteItemIndex(null);
        setLotesDisponibles([]);
        setLoteSearchTerm('');
        setShowCreateLote(false);
        setProveedorNombreImportado('');
        setDocReferenciaVisible('');
        toast.info("Formulario reiniciado.");
    };

    const handleImportarDocumento = () => {
        if (!transaccionRules.allowImportDocs) {
            toast.warning("Esta transacción no permite importar documentos.");
            return;
        }
        if (isImportedData) {
            toast.warning("Ya hay un documento importado. Limpia la importación actual para cargar otro.");
            return;
        }
        setIsImportModalOpen(true);
    };

    const handleDataImportada = async (cabecera: any, detallesImportados: any[]) => {
        // 🚀 IDENTIFICACIÓN DINÁMICA DEL DOCUMENTO IMPORTADO
        const isGuia = !!cabecera.guiasremisionId;
        const isVenta = !!cabecera.documentoventaId; // Para el caso DV
        const provIdLimpio = String(
            isVenta
                ? (cabecera.clienteId || '')
                : (cabecera.proveedorId || cabecera.clienteId || '')
        ).trim();
        const provNombre = String(
            isVenta
                ? (cabecera.cliente?.descripcion || cabecera.clienteDesc || '')
                : (cabecera.proveedor?.descripcion || cabecera.proveedornombre || cabecera.clienteDesc || cabecera.cliente?.descripcion || '')
        ).trim();
        
        setProveedorNombreImportado(provNombre); 
        
        const realDocId = isGuia ? cabecera.guiasremisionId : (isVenta ? cabecera.documentoventaId : cabecera.documentocompraId);
        const tablaReferencia = isGuia ? "GUIAS_REMISION" : (isVenta ? "DOCUMENTO_VENTA" : "DOCUMENTO_COMPRA");
        const visualString = `${String(cabecera.serie || '').trim()}-${String(cabecera.numero || cabecera.correlativo || '').trim()}`;

        setDocReferenciaVisible(visualString);

        setFormData(prev => ({
            ...prev,
            tipodoccomercialId: String(cabecera.tipodoccomercialId || '').trim(),
            doc_referencia: tablaReferencia,       
            doc_referencia_numero: realDocId,      
            proveedorId: provIdLimpio,
            monedaId: '001',
            tipo_cambio: cabecera.tipo_cambio || cabecera.tipoCambio || 1,
        }));
        
        toast.info("Procesando y calculando unidades disponibles...");
        
        try {
            const enrichedItems: InternalNotaIngresoDetalle[] = await Promise.all(
                detallesImportados.map(async (det: any, index: number) => {
                    const pId = String(det.bienId).trim();
                    let productoLabel = det.bien?.descripcion || det.bienDesc || 'Producto Desconocido';
                    
                    // Solo hacemos fallback al endpoint si no viniera la descripcion
                    if(productoLabel === 'Producto Desconocido'){
                        try{
                           const resProd = await productoService.getByEmpresa(EMPRESA_ID, 1, 1, pId, {
                               condicion_estado: ['STOCK']
                           });
                           if(resProd.isSuccess && resProd.data && resProd.data.length > 0){
                               productoLabel = resProd.data[0].descripcion;
                           }
                        }catch(e){}
                    }

                    let opcionesUM: any[] = [];
                    try {
                        const res = await presentacionService.getByBien(pId);
                        if (res.isSuccess && res.data && res.data.length > 0) {
                            opcionesUM = res.data.map((pres: any) => ({
                                key: String(pres.presentacionId).trim(),
                                value: pres.descripcion || pres.unidadmedidaId,
                                presentacionId: String(pres.presentacionId).trim(),
                                cantidad_pres: Number(pres.cantidad || 1)
                            }));
                        }
                    } catch (e) {}

                    const presOriginal = det.presentacionId ? String(det.presentacionId).trim() : opcionesUM[0]?.presentacionId || '';

                    const cantidadDisponible = Number(det.saldoTemporal ?? det.saldo_temporal ?? det.cantidad ?? 0);
                    const costoUnitario = Number(det.costo ?? det.precio ?? 0);
                    const importeCalculado = parseFloat((cantidadDisponible * costoUnitario).toFixed(2));

                    return {
                        item: index + 1,
                        bienId: pId,
                        cantidad: cantidadDisponible,
                        saldoMaximo: cantidadDisponible, 
                        costo: costoUnitario,
                        importe: importeCalculado,
                        presentacionId: presOriginal,
                        loteId: det.loteId || '',
                        descripcion_aux: productoLabel,
                        unidad_aux: '',
                        unidades_opciones: opcionesUM
                    };
                })
            );

            const itemsValidos = enrichedItems.filter(i => i.cantidad > 0);

            if(itemsValidos.length === 0) {
                toast.warning("El documento seleccionado no tiene saldo disponible para ingresar.");
            } else {
                setItems(itemsValidos);
                setIsImportModalOpen(false);
                toast.success(`Documento cargado con ${itemsValidos.length} ítems disponibles.`);
            }

        } catch (error) {
            toast.error("Hubo un error al hidratar los detalles importados.");
        }
    };

    const handleAddItem = () => {
        setItems([...items, { 
            item: items.length + 1, bienId: '', cantidad: 1, costo: 0, importe: 0, 
            presentacionId: '', loteId: '', descripcion_aux: '', unidad_aux: '', unidades_opciones: [] 
        }]);
    };

    const handleRemoveItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index).map((it, i) => ({ ...it, item: i + 1 })));
    };

    const handleItemChange = async (index: number, field: keyof InternalNotaIngresoDetalle, value: any) => {
        setItems(prev => {
            const updated = [...prev];
            const item = { ...updated[index], [field]: value };

            if (field === 'cantidad') {
                const numericVal = Number(value);
                if (item.saldoMaximo !== undefined) {
                    if (numericVal > item.saldoMaximo) {
                        toast.warning(`La cantidad no puede superar el saldo disponible (${item.saldoMaximo}).`);
                        item.cantidad = item.saldoMaximo;
                    } else if (numericVal <= 0) {
                        toast.warning("La cantidad debe ser mayor a cero.");
                        item.cantidad = 1; 
                    } else {
                        item.cantidad = numericVal;
                    }
                } else {
                    if (numericVal <= 0) {
                        toast.warning("La cantidad debe ser mayor a cero.");
                        item.cantidad = 1;
                    } else {
                        item.cantidad = numericVal;
                    }
                }
            }

            if (field === 'cantidad' || field === 'costo') {
                const qty = Number(item.cantidad) || 0;
                const cost = Number(item.costo) || 0;
                item.importe = parseFloat((qty * cost).toFixed(2));
            }

            if (field === 'bienId') {
                item.unidades_opciones = [{ key: 'loading', presentacionId: '', value: 'Cargando...' }];
                item.costo = 0; 
            }

            updated[index] = item;
            return updated;
        });

        if (field === 'bienId' && value) {
            try {
                const resProd = await productoService.getByEmpresa(EMPRESA_ID, 1, 1, value, {
                    condicion_estado: ['STOCK']
                });
                const rawBienData = resProd.isSuccess && resProd.data && resProd.data.length > 0 ? resProd.data[0] : null;

                const res = await presentacionService.getByBien(value);
                let opcionesUM: any[] = [];
                
                if (res.isSuccess && res.data && res.data.length > 0) {
                    opcionesUM = res.data.map((pres: any) => ({
                        key: String(pres.presentacionId).trim(),
                        value: pres.descripcion || pres.unidadmedidaId,
                        presentacionId: String(pres.presentacionId).trim(),
                        cantidad_pres: Number(pres.cantidad || 1) 
                    }));
                } else {
                    const baseUnit = rawBienData?.unidadmedidaId || 'NIU';
                    opcionesUM = [{ key: baseUnit, value: baseUnit, presentacionId: baseUnit, cantidad_pres: 1 }];
                }

                setItems(prev => {
                    const updated = [...prev];
                    if (updated[index] && updated[index].bienId === value) {
                        updated[index].descripcion_aux = rawBienData ? rawBienData.descripcion : '';
                        updated[index].unidades_opciones = opcionesUM;
                        updated[index].presentacionId = opcionesUM[0]?.presentacionId || '';
                    }
                    return updated;
                });
            } catch (error) {
                toast.error("Error al cargar datos del producto");
            }
        }
    };

    const fetchLotesDisponibles = async (index: number, search: string = '') => {
        const item = items[index];
        if (!formData.almacenId) {
            setLotesDisponibles([]);
            return;
        }
        setLoadingLotes(true);
        try {
            const res = await almacenLoteService.getByAlmacenYPresentacion(
                formData.almacenId, 
                item.presentacionId, 
                1, 
                100,
                { Tipo: 'NI', SearchTerm: search }
            );

            if (res.isSuccess) {
                const mappedLotes = (res.data || [])
                    .map((l: any) => ({
                        value: l.loteId,
                        label: l.descripcion || l.loteId,
                        aux: Number(l.stock_disponible || 0),
                        raw: l 
                    }))
                    .sort((a: any, b: any) => Number(b.aux || 0) - Number(a.aux || 0));
                setLotesDisponibles(mappedLotes);
            } else {
                setLotesDisponibles([]);
            }
        } catch (error) {
            toast.error("Error al cargar lotes");
        } finally {
            setLoadingLotes(false);
        }
    };

    const handleOpenLotes = (index: number) => {
        const item = items[index];
        if (!formData.almacenId) {
            toast.warning("Seleccione un almacén primero.");
            return;
        }
        if (!item.bienId || !item.presentacionId) {
            toast.warning("Seleccione un producto y presentación primero.");
            return;
        }
        setActiveLoteItemIndex(index);
        setLoteSearchTerm(''); 
        setShowCreateLote(false); 
        setShowLoteModal(true);
        fetchLotesDisponibles(index, ''); 
    };

    const handleLoteSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setLoteSearchTerm(val);
        if (loteSearchTimeoutRef.current) clearTimeout(loteSearchTimeoutRef.current);
        loteSearchTimeoutRef.current = setTimeout(() => {
            if (activeLoteItemIndex !== null) fetchLotesDisponibles(activeLoteItemIndex, val);
        }, 500); 
    };

    const handleAssignLote = (loteId: string) => {
        if (activeLoteItemIndex !== null) {
            setItems(prev => {
                const updated = [...prev];
                updated[activeLoteItemIndex].loteId = loteId;
                return updated;
            });
            toast.success(`Lote ${loteId} asignado.`);
        }
        setShowLoteModal(false);
    };

    const handleCreateLote = async () => {
        if (!newLoteForm.fecha_produccion || !newLoteForm.fecha_vencimiento || !newLoteForm.fecha_alerta) {
            return toast.warning("Complete todas las fechas.");
        }

        const fProd = new Date(newLoteForm.fecha_produccion);
        const fVenc = new Date(newLoteForm.fecha_vencimiento);
        const fAlert = new Date(newLoteForm.fecha_alerta);

        if (fVenc <= fProd) return toast.error("El vencimiento debe ser mayor a la producción.");
        if (fAlert <= fProd || fAlert >= fVenc) return toast.error("La alerta debe estar entre la producción y el vencimiento.");

        const presentacionIdTarget = activeLoteItemIndex !== null ? items[activeLoteItemIndex].presentacionId : '';

        if (!presentacionIdTarget) return toast.error("Error: Presentación no definida.");

        setCreatingLote(true);
        try {
            const payload = {
                descripcion: newLoteForm.descripcion,
                fecha_produccion: newLoteForm.fecha_produccion,
                fecha_vencimiento: newLoteForm.fecha_vencimiento,
                fecha_alerta: newLoteForm.fecha_alerta,
                empresaId: EMPRESA_ID,
                codigo_lote_importacion: newLoteForm.codigo_lote_importacion,
                detalles: [
                    {
                        presentacionId: presentacionIdTarget,
                        almacenId: formData.almacenId || '',
                        cantidad_lote_stock: 0 
                    }
                ]
            };

            const res = await almacenLoteService.create(payload);
            
            if (res.isSuccess) {
                toast.success("Lote creado y asignado exitosamente.");
                handleAssignLote(res.data?.loteId);
                setShowCreateLote(false);
            } else {
                toast.error(res.message || "Error al crear el lote.");
            }
        } catch (error: any) {
            toast.error(error.message || "Error de conexión al servidor.");
        } finally {
            setCreatingLote(false);
        }
    };

    const handleSubmit = async () => {
        if (!formData.almacenId) return toast.error("Seleccione un Almacén Origen.");
        if (!formData.transaccionId) return toast.error("Seleccione un Tipo de Transacción.");
        if (items.length === 0) return toast.error("Debe agregar al menos un producto.");
        
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (!item.bienId) return toast.error(`La fila ${i + 1} no tiene un producto seleccionado.`);
            if (item.cantidad <= 0) return toast.error(`La cantidad en la fila ${i + 1} debe ser mayor a cero.`);
            if (transaccionRules.requireCosto && item.costo <= 0) return toast.error(`El costo en la fila ${i + 1} debe ser mayor a cero para esta transacción.`);
        }

        setLoading(true);
        try {
            const payload: NotaIngresoPayload = {
                transaccionId: formData.transaccionId,
                monedaId: '001',
                tipo_cambio: Number(formData.tipo_cambio) || 1,
                tipodoccomercialId: formData.tipodoccomercialId || '',
                doc_referencia: formData.doc_referencia || '', 
                doc_referencia_numero: formData.doc_referencia_numero || '', 
                almacenId: formData.almacenId || '',
                estado: formData.estado || 'REGISTRADO',
                cuentausuario: formData.cuentausuario || USER_ID,
                observaciones: formData.observaciones || '',
                nro_contenedor: formData.nro_contenedor || '',
                empresaId: EMPRESA_ID,
                detalles: items.map((it, idx) => ({
                    item: idx + 1,
                    bienId: it.bienId,
                    cantidad: Number(it.cantidad),
                    costo: Number(it.costo),
                    importe: Number(it.importe),
                    presentacionId: it.presentacionId,
                    loteId: it.loteId || null
                }))
            };

            const res = await notaIngresoService.create(payload);
            if (res.isSuccess) {
                toast.success(res.message || "Nota de ingreso generada exitosamente.");
                router.push('/dashboard/notas-ingreso');
            } else {
                toast.error(res.message || "Error al generar la nota.");
            }
        } catch (error) {
            toast.error("Error crítico al enviar los datos.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-[95%] mx-auto pb-20 animate-fade-in-up">
            
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                        <IconArrowLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Nueva Nota de Ingreso</h1>
                        <p className="text-xs text-slate-500">Recepción y Ajustes de Inventario</p>
                    </div>
                </div>
                <div className="flex gap-3 items-center">
                    {isImportedData && (
                        <button 
                            type="button"
                            onClick={handleClearForm}
                            className="px-3 py-2.5 rounded-xl bg-rose-50 text-rose-700 font-bold hover:bg-rose-100 shadow-sm border border-rose-100 flex items-center justify-center transition-all active:scale-95"
                            title="Limpiar importación"
                        >
                            <IconX size={16} />
                        </button>
                    )}

                    {transaccionRules.allowImportDocs && (
                        <button 
                            onClick={handleImportarDocumento}
                            disabled={isImportedData}
                            className={`px-4 py-2.5 rounded-xl font-bold shadow-sm border flex items-center gap-2 transition-all active:scale-95 ${
                                isImportedData
                                    ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                                    : 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-100'
                            }`}
                        >
                            <IconSearch size={18} /> Importar Doc.
                        </button>
                    )}
                    <button 
                        onClick={handleSubmit} 
                        disabled={loading || loadingCatalogs}
                        className="px-6 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                    >
                        <IconDeviceFloppy size={20} /> Guardar Nota
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-12 gap-6">
                <div className="col-span-12 lg:col-span-8 space-y-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <SectionTitle title="Información de Transacción" icon={IconFileDescription} />
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <SearchableSelect
                                    label="Almacén Origen (Local) *"
                                    name="almacenId"
                                    options={almacenOrigenOptions}
                                    value={formData.almacenId || ''}
                                    onChange={handleChange}
                                    disabled={false}
                                    placeholder="Seleccione un almacén"
                                />
                            </div>

                            <div className={transaccionRules.allowImportDocs ? "md:col-span-2" : "md:col-span-1"}>
                                <SearchableSelect 
                                    label="Tipo Transacción *" 
                                    name="transaccionId"
                                    options={transaccionOptions}
                                    value={formData.transaccionId || ''} 
                                    onChange={handleChange}
                                    disabled={!formData.almacenId}
                                />
                            </div>

                            {transaccionRules.allowImportDocs && (
                                <>
                                    <FormInput 
                                        label="Tipo Documento" 
                                        value={catalogs['TipoDocumentoComercial']?.find((x: any) => String(x.value).trim() === String(formData.tipodoccomercialId).trim())?.label || formData.tipodoccomercialId || 'SIN ASIGNAR'} 
                                        disabled={true}
                                        className="bg-slate-50 border-slate-200 text-slate-600 uppercase font-semibold"
                                    />

                                    <FormInput 
                                        label="N° Documento Ref." 
                                        value={docReferenciaVisible || 'SIN ASIGNAR'} 
                                        disabled={true}
                                        className="bg-slate-50 border-slate-200 text-slate-600 uppercase font-semibold"
                                    />
                                </>
                            )}
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <div className="flex justify-between items-center border-b border-slate-200 pb-2 mb-4 mt-2">
                            <div className="flex items-center gap-2 text-slate-800">
                                <IconPackage className="text-blue-600" size={20} />
                                <h3 className="font-bold text-sm uppercase tracking-wide">Detalle de Productos</h3>
                            </div>
                            <button 
                                type="button" 
                                onClick={handleAddItem} 
                                disabled={isImportedData} 
                                className={`text-xs px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 transition-colors
                                    ${isImportedData ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-blue-50 text-blue-700 hover:bg-blue-100'}`}
                            >
                                <IconPlus size={14} /> Agregar Fila
                            </button>
                        </div>
                        
                        <div className="overflow-visible min-h-[250px]">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50 text-slate-500 uppercase font-semibold">
                                    <tr>
                                        <th className="p-3 w-8">#</th>
                                        <th className="p-3 w-[30%]">Producto</th>
                                        <th className="p-3 w-32">Presentación</th>
                                        <th className="p-3 w-20 text-right">Cant.</th>
                                        
                                        <th className="p-3 w-24 text-right">Conv. Total</th>

                                        {transaccionRules.requireCosto && (
                                            <>
                                                <th className="p-3 w-24 text-right">Costo</th>
                                                <th className="p-3 w-24 text-right">Importe</th>
                                            </>
                                        )}
                                        <th className="p-3 w-16 text-center">Lotes</th>
                                        <th className="p-3 w-10 text-center">Acc.</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {items.length === 0 ? (
                                        <tr>
                                            <td colSpan={transaccionRules.requireCosto ? 9 : 7} className="p-8 text-center text-slate-400 italic">
                                                No hay items. {isImportedData ? 'El documento importado no contiene detalles válidos.' : 'Agregue productos al detalle.'}
                                            </td>
                                        </tr>
                                    ) : (
                                        items.map((item: any, idx) => {
                                            
                                            const selectedUM = item.unidades_opciones?.find((u: any) => u.presentacionId === item.presentacionId);
                                            const factor = selectedUM?.cantidad_pres || 1;
                                            const conversionTotal = (Number(item.cantidad) * factor).toFixed(2);

                                            return (
                                                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                                    <td className="p-3 text-center font-mono text-slate-400">{item.item}</td>
                                                    <td className="p-3">
                                                        <SearchableSelect 
                                                            name="bienId"
                                                            fetchCustom={async (term) => {
                                                                const res = await productoService.getByEmpresa(EMPRESA_ID, 1, 20, term, {
                                                                    condicion_estado: ['STOCK']
                                                                });
                                                                if (res.isSuccess) {
                                                                    return (res.data || []).map((p: any) => ({
                                                                        key: String(p.bienId || '').trim(),
                                                                        value: String(p.bienId || '').trim(),
                                                                        label: String(p.descripcion || '').trim(),
                                                                        aux: String(p.codigo_existencia || '').trim(),
                                                                        raw: p
                                                                    }));
                                                                }
                                                                return [];
                                                            }}
                                                            value={item.bienId || ''} 
                                                            fallbackLabel={item.descripcion_aux}
                                                            onChange={(e:any) => handleItemChange(idx, 'bienId', e.target.value)}
                                                            disabled={isImportedData}
                                                        />
                                                    </td>
                                                    <td className="p-3">
                                                        <SearchableSelect 
                                                            options={item.unidades_opciones?.map((u: any) => ({
                                                                key: u.presentacionId || u.key,
                                                                value: u.presentacionId || u.key,
                                                                label: u.value
                                                            })) || []}
                                                            value={item.presentacionId || ''} 
                                                            onChange={(e: any) => handleItemChange(idx, 'presentacionId', e.target.value)}
                                                            disabled={isImportedData || !item.unidades_opciones || item.unidades_opciones.length === 0}
                                                        />
                                                    </td>
                                                    <td className="p-3">
                                                        <input 
                                                            type="number" 
                                                            className={`w-full border p-1.5 text-right rounded outline-none focus:ring-1 bg-white shadow-sm transition-colors
                                                                ${item.saldoMaximo && item.cantidad > item.saldoMaximo 
                                                                    ? 'border-red-500 focus:border-red-500 focus:ring-red-500 text-red-600 bg-red-50' 
                                                                    : 'border-slate-200 focus:border-blue-400 focus:ring-blue-400'}`} 
                                                            min="1" 
                                                            value={item.cantidad} 
                                                            onChange={(e) => handleItemChange(idx, 'cantidad', e.target.value)} 
                                                        />
                                                    </td>
                                                    
                                                    <td className="p-3 text-right">
                                                        <div className="w-full bg-slate-100 border border-slate-200 p-1.5 rounded font-bold text-slate-500 truncate cursor-not-allowed">
                                                            {conversionTotal}
                                                        </div>
                                                    </td>

                                                    {transaccionRules.requireCosto && (
                                                        <>
                                                            <td className="p-3">
                                                                <input 
                                                                    type="number" step="0.01" 
                                                                    className="w-full border border-slate-200 p-1.5 text-right rounded outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 bg-white shadow-sm" 
                                                                    value={item.costo} 
                                                                    onChange={(e) => handleItemChange(idx, 'costo', e.target.value)} 
                                                                />
                                                            </td>
                                                            <td className="p-3 text-right font-semibold bg-slate-50 text-slate-600 rounded">
                                                                {item.importe.toFixed(2)}
                                                            </td>
                                                        </>
                                                    )}
                                                    <td className="p-3 text-center">
                                                        <button 
                                                            type="button" 
                                                            onClick={() => handleOpenLotes(idx)} 
                                                            className={`px-2 py-1 rounded text-[10px] font-bold transition-all shadow-sm border ${item.loteId ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200' : 'bg-slate-50 text-slate-600 hover:bg-blue-50 hover:text-blue-700 border-slate-200 hover:border-blue-200'}`}
                                                        >
                                                            {item.loteId ? 'Lote OK' : '+ Lote'}
                                                        </button>
                                                    </td>
                                                    <td className="p-3 text-center">
                                                        <button 
                                                            type="button" 
                                                            onClick={() => handleRemoveItem(idx)} 
                                                            disabled={isImportedData} 
                                                            className={`p-1.5 transition-colors rounded ${isImportedData ? 'text-slate-300 cursor-not-allowed' : 'text-slate-400 hover:bg-red-50 hover:text-red-500'}`}
                                                        >
                                                            <IconTrash size={16}/>
                                                        </button>
                                                    </td>
                                                </tr>
                                            )
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div className="col-span-12 lg:col-span-4 space-y-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 sticky top-4">
                        <SectionTitle title="Entidad y Extras" icon={IconBuildingStore} />
                        <div className="space-y-4">
                            
                            {isImportedData && (
                                <div className="animate-in fade-in zoom-in-95">
                                    <FormInput 
                                        label={importedEntityLabel} 
                                        value={proveedorNombreImportado || formData.proveedorId || 'SIN ASIGNAR'} 
                                        disabled={true}
                                        className="bg-slate-50 border-slate-200 text-slate-600 uppercase font-semibold"
                                    />
                                </div>
                            )}

                            {transaccionRules.requireContenedor && (
                                <div className="animate-in fade-in slide-in-from-top-2">
                                    <FormInput 
                                        label="Nro Contenedor (Opcional)" name="nro_contenedor" 
                                        value={formData.nro_contenedor} onChange={handleChange} 
                                        placeholder="Ej: MSBU1776162"
                                        className="border-slate-200 uppercase"
                                    />
                                </div>
                            )}

                            <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Moneda</label>
                                <select 
                                    name="monedaId" value={formData.monedaId} onChange={handleChange}
                                    className="w-full border border-slate-200 p-2.5 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                >
                                    {catalogs['Moneda']?.map((m: any) => (
                                        <option key={m.value} value={m.value}>{m.label}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="pt-4 border-t border-slate-100">
                                <FormInput 
                                    label="Observaciones Generales" name="observaciones" 
                                    value={formData.observaciones} onChange={handleChange} 
                                    placeholder="Agregue notas o detalles adicionales..."
                                    className="uppercase"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal de Lotes */}
            <Modal isOpen={showLoteModal} onClose={() => { setShowLoteModal(false); setShowCreateLote(false); }} title={showCreateLote ? "Crear Nuevo Lote" : "Asignación de Lotes"} size="xl">
                <div className="p-4 space-y-4">
                    
                    {!showCreateLote ? (
                        <>
                            <div className="flex justify-between items-end mb-2">
                                <p className="text-xs text-slate-600 bg-blue-50 p-2.5 rounded border border-blue-100 flex-1 mr-2">
                                    Seleccione el Lote al que ingresará este producto.
                                </p>
                                <button 
                                    onClick={() => setShowCreateLote(true)}
                                    className="h-[38px] px-3 bg-slate-900 text-white rounded-lg hover:bg-slate-800 font-bold flex items-center justify-center transition-colors text-xs shrink-0"
                                >
                                    <IconPlus size={14} className="mr-1" /> Crear
                                </button>
                            </div>
                            
                            <div className="relative">
                                <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input 
                                    type="text" 
                                    placeholder="Buscar lote por código, fecha o descripción..." 
                                    className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500 transition-colors"
                                    value={loteSearchTerm}
                                    onChange={handleLoteSearchChange}
                                />
                            </div>
                            
                            {loadingLotes ? (
                                <div className="text-center py-8"><span className="animate-spin text-blue-600 font-bold inline-block"><IconLoader size={28} /></span></div>
                            ) : lotesDisponibles.length === 0 ? (
                                <div className="text-center py-6 text-slate-500 italic">
                                    No se encontraron lotes. 
                                    <button onClick={() => setShowCreateLote(true)} className="text-blue-600 font-bold ml-1 hover:underline">Crear uno nuevo.</button>
                                </div>
                            ) : (
                                <div className="max-h-[28rem] overflow-y-auto border rounded-lg">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-slate-100 sticky top-0 shadow-sm">
                                            <tr>
                                                <th className="p-2">Lote ID</th>
                                                <th className="p-2">Descripción</th>
                                                <th className="p-2 text-right">Stock</th>
                                                <th className="p-2">F. Producción</th>
                                                <th className="p-2">F. Vencimiento</th>
                                                <th className="p-2 text-center">Acción</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {lotesDisponibles.map((lote: any) => (
                                                <tr key={lote.value} className="border-t hover:bg-slate-50">
                                                    <td className="p-2 font-mono font-bold text-slate-700">{lote.value}</td>
                                                    <td className="p-2 text-slate-600 min-w-[180px]" title={lote.label}>{lote.label}</td>
                                                    <td className="p-2 text-right font-mono font-bold text-blue-700 whitespace-nowrap">
                                                        {Number(lote.raw?.stock_disponible || 0).toFixed(2)}
                                                    </td>
                                                    <td className="p-2 text-slate-600 whitespace-nowrap">
                                                        {lote.raw?.fecha_produccion ? format(new Date(lote.raw.fecha_produccion), 'dd/MM/yyyy') : '-'}
                                                    </td>
                                                    <td className="p-2 text-slate-600 whitespace-nowrap">
                                                        {lote.raw?.fecha_vencimiento ? format(new Date(lote.raw.fecha_vencimiento), 'dd/MM/yyyy') : '-'}
                                                    </td>
                                                    <td className="p-2 text-center">
                                                        <div className="flex justify-center items-center gap-2">
                                                            <button 
                                                                onClick={() => { setSelectedLoteData(lote.raw); setDetailLoteModalOpen(true); }}
                                                                className="p-1.5 bg-amber-50 text-amber-600 rounded hover:bg-amber-100 transition-colors border border-amber-200"
                                                                title="Ver Detalle"
                                                            >
                                                                <IconEye size={16} />
                                                            </button>
                                                            <button 
                                                                onClick={() => handleAssignLote(lote.value)}
                                                                className="bg-blue-100 text-blue-700 px-3 py-1 rounded font-bold hover:bg-blue-200 w-full"
                                                            >
                                                                Asignar
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="space-y-4 animate-in fade-in zoom-in-95">
                            <div className="grid grid-cols-2 gap-4">
                                <FormInput 
                                    label="Código Importación (Opcional)" 
                                    value={newLoteForm.codigo_lote_importacion}
                                    onChange={(e:any) => setNewLoteForm({...newLoteForm, codigo_lote_importacion: e.target.value})}
                                    placeholder="Ej. LOT-1234"
                                />
                                <FormInput 
                                    label="Descripción" 
                                    value={newLoteForm.descripcion}
                                    onChange={(e:any) => setNewLoteForm({...newLoteForm, descripcion: e.target.value})}
                                    placeholder="Detalle del lote"
                                />
                                <FormInput 
                                    label="F. Producción *" type="date"
                                    value={newLoteForm.fecha_produccion}
                                    onChange={(e:any) => setNewLoteForm({...newLoteForm, fecha_produccion: e.target.value})}
                                />
                                <FormInput 
                                    label="F. Vencimiento *" type="date"
                                    value={newLoteForm.fecha_vencimiento}
                                    onChange={(e:any) => setNewLoteForm({...newLoteForm, fecha_vencimiento: e.target.value})}
                                />
                                <div className="col-span-2">
                                    <FormInput 
                                        label="F. Alerta *" type="date"
                                        value={newLoteForm.fecha_alerta}
                                        onChange={(e:any) => setNewLoteForm({...newLoteForm, fecha_alerta: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div className="flex gap-2 pt-2 border-t">
                                <button 
                                    onClick={() => setShowCreateLote(false)} 
                                    className="flex-1 py-2 bg-slate-100 rounded font-bold text-slate-600 hover:bg-slate-200"
                                >
                                    Volver
                                </button>
                                <button 
                                    onClick={handleCreateLote} 
                                    disabled={creatingLote}
                                    className="flex-1 py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 flex justify-center items-center gap-2"
                                >
                                    {creatingLote ? <IconLoader size={18} className="animate-spin" /> : <IconDeviceFloppy size={18} />} Guardar Lote
                                </button>
                            </div>
                        </div>
                    )}

                    {!showCreateLote && (
                        <div className="flex justify-end pt-2 border-t border-slate-100">
                            <button onClick={() => { setShowLoteModal(false); setShowCreateLote(false); }} className="px-4 py-2 bg-slate-200 rounded font-bold text-slate-700 hover:bg-slate-300">Cerrar</button>
                        </div>
                    )}
                </div>
            </Modal>
            
            {/* Modal de Detalle de Lote */}
            <Modal isOpen={detailLoteModalOpen} onClose={() => setDetailLoteModalOpen(false)} title="Detalle de Lote" size="md">
                {selectedLoteData && (
                    <div className="p-5 space-y-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase">Lote ID</p>
                                <p className="text-lg font-mono font-bold text-slate-800">{selectedLoteData.loteId}</p>
                            </div>
                            <span className={`px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${selectedLoteData.estado === 'Activo' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                {selectedLoteData.estado}
                            </span>
                        </div>

                        <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Descripción / Observación</p>
                            <p className="text-sm font-semibold text-slate-700">{selectedLoteData.descripcion || 'Sin descripción'}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">Fecha Producción</p>
                                <p className="text-sm font-semibold text-slate-700">{selectedLoteData.fecha_produccion ? format(new Date(selectedLoteData.fecha_produccion), 'dd/MM/yyyy') : '-'}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">Fecha Vencimiento</p>
                                <p className="text-sm font-semibold text-slate-700">{selectedLoteData.fecha_vencimiento ? format(new Date(selectedLoteData.fecha_vencimiento), 'dd/MM/yyyy') : '-'}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">Fecha Alerta</p>
                                <p className="text-sm font-semibold text-amber-600">{selectedLoteData.fecha_alerta ? format(new Date(selectedLoteData.fecha_alerta), 'dd/MM/yyyy') : '-'}</p>
                            </div>
                            <div>
                                <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">Cód. Importación</p>
                                <p className="text-sm font-semibold text-slate-700">{selectedLoteData.codigo_lote_importacion || '-'}</p>
                            </div>
                        </div>

                        <div className="flex justify-between items-center bg-blue-50 p-4 rounded-xl border border-blue-100">
                            <div>
                                <p className="text-[10px] font-bold text-blue-600 uppercase">Stock Actual (Lote)</p>
                                <p className="text-2xl font-black text-blue-700">{Number(selectedLoteData.stock_disponible || 0).toFixed(2)}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-bold text-blue-600 uppercase">Empresa</p>
                                <p className="text-xs font-semibold text-blue-800 max-w-[150px] truncate" title={selectedLoteData.empresa?.razon_social}>{selectedLoteData.empresa?.razon_social || 'N/A'}</p>
                            </div>
                        </div>

                        <div className="flex justify-end pt-2 border-t border-slate-100">
                            <button onClick={() => setDetailLoteModalOpen(false)} className="px-5 py-2 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 transition-colors">
                                Entendido
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Modal de Importación */}
            {isImportModalOpen && (
                <ImportarDocumentoModal
                    isOpen={isImportModalOpen}
                    onClose={() => setIsImportModalOpen(false)}
                    empresaId={EMPRESA_ID}
                    transaccionRules={transaccionRules}
                    catalogoTiposDoc={catalogs['TipoDocumentoComercial'] || []}
                    onImport={handleDataImportada}
                    soloStock={true} 
                />
            )}
        </div>
    );
}
