// src/app/dashboard/notas-salida/crear/page.tsx
"use client";
import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { format } from 'date-fns';

// Servicios y Tipos
import { notaSalidaService } from '@/services/notaSalidaService';
import { notaIngresoService } from '@/services/notaIngresoService';
import { productoService } from '@/services/productoService';
import { presentacionService } from '@/services/presentacionService'; 
import { almacenLoteService } from '@/services/almacenLoteService';
import { useCatalogs } from '@/hooks/useCatalogs'; 
import { NotaSalidaPayload, NotaSalidaDetalle } from '@/types/notaSalida.types';

// Componentes UI
import SearchableSelect from '@/components/forms/SearchableSelect';
import ImportarDocumentoModal from '@/components/forms/ImportarDocumentoModal';
import Modal from '@/components/ui/Modal'; 
import { 
    IconDeviceFloppy, IconArrowLeft, IconFileDescription, 
    IconBuildingStore, IconPackage, IconPlus, IconTrash, IconSearch,
    IconLoader, IconListDetails, IconExchange, IconX
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

// Tipo interno extendido para manejar estado de UI
interface InternalNotaSalidaDetalle extends NotaSalidaDetalle {
    stockReal?: number;
    unidades_opciones?: any[];
    descripcion_aux?: string;
    bienDestinoId?: string | null;
    presentacionDestinoId?: string | null;
    destinoLabel?: string;
    cantidadDestino?: number; // 🚀 NUEVO: Guardar la conversión
    cantidadMaxImportada?: number; // 🚀 Cuando viene de importación, no permitir exceder
}

export default function CrearNotaSalidaPage() {
    const router = useRouter();
    
    const EMPRESA_ID = "005";
    const USER_ID = "CU0001";     
    const USER_NAME = "BIOSNET";  

    const todayStr = format(new Date(), 'yyyy-MM-dd');

    const [loading, setLoading] = useState(false);
    
    // Estado del Formulario Cabecera
    const [formData, setFormData] = useState<Partial<NotaSalidaPayload>>({
        empresaId: EMPRESA_ID, 
        almacenId: '',
        cuentausuario: USER_ID, 
        estado: 'REGISTRADO',
        transaccionId: '', 
        tipodoccomercialId: '', 
        doc_referencia_numero: '', 
        monedaId: '001', 
        tipo_cambio: 1.0, 
        observaciones: '',
        almacenDestinoId: '' 
    });

    const [items, setItems] = useState<InternalNotaSalidaDetalle[]>([]);
    
    // UI Importación
    const [clienteNombre, setClienteNombre] = useState('SIN CLIENTE / NO APLICA');
    const [docReferenciaVisible, setDocReferenciaVisible] = useState<string>('');
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const isImportedData = !!formData.doc_referencia_numero;

    // Estados Lotes (Distribución)
    const [lotesAsignados, setLotesAsignados] = useState<Record<number, any[]>>({});
    const [showLoteModal, setShowLoteModal] = useState(false);
    const [activeLoteIndex, setActiveLoteIndex] = useState<number | null>(null);
    const [loteInput, setLoteInput] = useState({ cantidad: 1 });
    const [lotesDisponibles, setLotesDisponibles] = useState<any[]>([]);
    const [loadingLotes, setLoadingLotes] = useState(false);
    const [loteSearchTerm, setLoteSearchTerm] = useState('');
    const loteSearchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Estados Cambio de Código (SC)
    const [showSCModal, setShowSCModal] = useState(false);
    const [activeSCIndex, setActiveSCIndex] = useState<number | null>(null);
    const [scInput, setScInput] = useState({ 
        bienDestinoId: '', 
        presentacionDestinoId: '', 
        destinoLabel: '', 
        destinoAux: '',
        unidades_opciones: [] as any[],
        cantidadInicial: 1,
        cantidadCalculada: 0,
        factorOrigen: 1
    });
    const [scSearchTerm, setScSearchTerm] = useState('');
    const [scSearchResults, setScSearchResults] = useState<any[]>([]);
    const [scSearchLoading, setScSearchLoading] = useState(false);
    const scSearchReqIdRef = useRef(0);
    const [xpSearchTerm, setXpSearchTerm] = useState('');

    // Carga de Catálogos
    const { catalogs, loadingCatalogs } = useCatalogs([
        'Moneda',
        'TipoDocumentoComercial',
        { endpoint: 'TablaTransacciones', params: { empresaId: EMPRESA_ID } },
        { endpoint: 'Almacen', params: { empresaId: EMPRESA_ID } },
        ...(formData.almacenId
            ? [{ endpoint: 'TablaTransaccionesPerfil', params: { cuentausuarioId: USER_NAME, almacenId: formData.almacenId } }]
            : [])
    ]);

    const almacenOrigenOptions = useMemo(() => {
        const activos = (catalogs['Almacen'] || []).filter((a: any) => {
            const estado = a?.originalData?.estado ?? a?.estado;
            return estado === true || estado === 1 || estado === '1';
        });
        return [...activos].sort((a: any, b: any) => {
            const tipoA = Number(
                a?.originalData?.tipoalmacenId ??
                a?.originalData?.tipoAlmacen?.tipoAlmacenId ??
                9999
            );
            const tipoB = Number(
                b?.originalData?.tipoalmacenId ??
                b?.originalData?.tipoAlmacen?.tipoAlmacenId ??
                9999
            );

            const prioA = tipoA === 3 ? 0 : 1;
            const prioB = tipoB === 3 ? 0 : 1;
            if (prioA !== prioB) return prioA - prioB;
            if (tipoA !== tipoB) return tipoA - tipoB;

            const labelA = String(a?.label || '').toUpperCase();
            const labelB = String(b?.label || '').toUpperCase();
            return labelA.localeCompare(labelB);
        });
    }, [catalogs]);

    const almacenDestinoOptions = useMemo(() => {
        const transaccionId = String(formData.transaccionId || '').trim();

        return almacenOrigenOptions.filter((a: any) => {
            if (String(a.value) === String(formData.almacenId)) return false;

            const tipoAlmacenId = String(
                a?.originalData?.tipoalmacenId ??
                a?.originalData?.tipoAlmacen?.tipoAlmacenId ??
                ''
            ).trim();

            if (transaccionId === 'DO') return tipoAlmacenId === '3';
            if (transaccionId === 'SA') return ['3', '5'].includes(tipoAlmacenId);
            if (transaccionId === 'SM') return tipoAlmacenId === '5';
            if (transaccionId === 'SP') return tipoAlmacenId === '3';
            if (transaccionId === 'YG') return tipoAlmacenId === '6';
            if (['YC', 'YF', 'YR', 'YV'].includes(transaccionId)) return tipoAlmacenId === '5';
            if (transaccionId === 'ZX') return true;

            return true;
        });
    }, [almacenOrigenOptions, formData.almacenId, formData.transaccionId]);

    const selectedAlmacenTipo = useMemo(() => {
        const almacenActual = (catalogs['Almacen'] || []).find((a: any) => String(a.value) === String(formData.almacenId));
        return String(
            almacenActual?.originalData?.tipoalmacenId ??
            almacenActual?.originalData?.tipoAlmacen?.tipoAlmacenId ??
            ''
        ).trim();
    }, [catalogs, formData.almacenId]);

    const ingresoCambioPresentacion = useMemo(() => {
        return (catalogs['TablaTransacciones'] || []).find((t: any) => {
            const desc = String(t?.label || t?.originalData?.descripcion || '').toUpperCase();
            const tipoMov = String(t?.originalData?.tipomovimientoId || '').trim().toUpperCase();
            return tipoMov === 'I' && desc.includes('CAMBIO DE PRESENTACION');
        });
    }, [catalogs]);

    // 🚀 Reglas de Transacción para Salidas Actualizadas
    const transaccionRules = useMemo(() => {
        const t = formData.transaccionId;
        const codigosTraslado = ['TE', 'SA', 'YG', 'DO', 'ZX', 'SM', 'SP', 'YC', 'YF', 'YR', 'YV'];        
        return {
            esTrasladoInterno: codigosTraslado.includes(t || ''),
            esCambioCodigo: t === 'SC',
            esCambioPresentacion: t === 'XP',
            
            allowImportDocs: ['SV', 'SB', 'CG', 'SU', 'TE', 'YG', 'DD'].includes(t || ''), // Agregado DD
            
            isSalidaVenta: t === 'SV',
            isBonificacion: t === 'SB',
            isConsignacion: t === 'CG',

            // 🚀 TIPOS DE DOCUMENTOS PERMITIDOS
            allowedDocTypes:
                ['TE', 'YG', 'DD'].includes(t || '') ? ['X031', 'X029'] : // Guías para Traslados y Devolución
                ['SV', 'SB', 'CG'].includes(t || '') ? ['X028', 'X007', 'X066'] : // Documentos para Ventas
                [],
            
            // 🚀 FILTROS EXCLUSIVOS PARA DOCUMENTOS DE VENTA (SV, SB, CG)
            filtrosVenta: ['SV', 'SB', 'CG'].includes(t || '') ? {
                RequiereSaldoPendiente: true,
                EsSalidaConsignacion: t === 'CG' 
            } : null,

            // 🚀 FILTROS EXCLUSIVOS PARA GUÍAS DE REMISIÓN (TE, YG, DD)
            filtrosGuia: ['TE', 'YG', 'DD'].includes(t || '') ? {
                // Para 7.14 TE: Solo MT00006 y REGISTRADO
                motivoTasladoJson: t === 'TE' ? ['MT00006'] :
                                 // Para 7.19 YG: Solo MT00007
                                 t === 'YG' ? ['MT00007'] :
                                 // Para 7.4 DD: Solo MT00005 (Devolución)
                                 t === 'DD' ? ['MT00005'] : [],
                
                estadoJson: t === 'TE' ? ['REGISTRADO'] :
                            t === 'YG' ? ['REGISTRADO', 'PENDIENTE'] :
                            // Para DD asumo que también se busca algo pendiente de devolver, ajusta si es necesario
                            t === 'DD' ? ['REGISTRADO', 'PENDIENTE'] : []
            } : null,

            requireCosto: true 
        };
    }, [formData.transaccionId]);

    const transaccionOptions = useMemo(() => {
        let opciones = catalogs['TablaTransaccionesPerfil'] || [];
        return opciones.filter((t: any) => 
            t.originalData?.tipomovimientoId === "S" && String(t.value).trim() !== "DP"
        );
    }, [catalogs]);

    // --- HANDLERS GENERALES ---
    const handleChange = (e: any) => {
        const { name, value } = e.target;
        if (name === 'almacenId') {
            setFormData(prev => ({
                empresaId: EMPRESA_ID,
                almacenId: value,
                cuentausuario: USER_ID,
                estado: 'REGISTRADO',
                transaccionId: '',
                tipodoccomercialId: '',
                doc_referencia: '',
                doc_referencia_numero: '',
                monedaId: '001',
                tipo_cambio: 1.0,
                observaciones: '',
                almacenDestinoId: ''
            }));
            setItems([]);
            setLotesAsignados({});
            setShowSCModal(false);
            setActiveSCIndex(null);
            setScInput({
                bienDestinoId: '',
                presentacionDestinoId: '',
                destinoLabel: '',
                destinoAux: '',
                unidades_opciones: [],
                cantidadInicial: 1,
                cantidadCalculada: 0,
                factorOrigen: 1
            });
            setClienteNombre('SIN CLIENTE / NO APLICA');
            setDocReferenciaVisible('');
            setIsImportModalOpen(false);
            return;
        }
        if (name === 'transaccionId') {
            handleClearForm(); 
            setFormData(prev => ({ ...prev, transaccionId: value }));
            return;
        }
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleClearForm = () => {
        setFormData({
            empresaId: EMPRESA_ID, almacenId: formData.almacenId || '', cuentausuario: USER_ID, estado: 'REGISTRADO',
            transaccionId: formData.transaccionId, tipodoccomercialId: '', doc_referencia: '', doc_referencia_numero: '', 
            monedaId: '001', tipo_cambio: 1.0, observaciones: '', almacenDestinoId: '' 
        });
        setItems([]);
        setLotesAsignados({});
        setActiveLoteIndex(null);
        setShowLoteModal(false);
        setLotesDisponibles([]);
        setLoteSearchTerm('');
        setLoteInput({ cantidad: 1 });
        setShowSCModal(false);
        setActiveSCIndex(null);
        setScInput({
            bienDestinoId: '',
            presentacionDestinoId: '',
            destinoLabel: '',
            destinoAux: '',
            unidades_opciones: [],
            cantidadInicial: 1,
            cantidadCalculada: 0,
            factorOrigen: 1
        });
        setClienteNombre('SIN CLIENTE / NO APLICA');
        setDocReferenciaVisible('');
    };

    const handleImportarDocumento = () => {
        if (!transaccionRules.allowImportDocs) return toast.warning("Esta transacción no permite importar documentos.");
        if (isImportedData) return toast.warning("Limpie la importación actual para cargar otro documento.");
        setIsImportModalOpen(true);
    };

    const handleDataImportada = async (cabecera: any, detallesImportados: any[]) => {
        const isGuia = !!cabecera.guiasremisionId;
        const realDocId = isGuia ? cabecera.guiasremisionId : cabecera.documentoventaId;
        const tablaReferencia = isGuia ? "GUIAS_REMISION" : "DOCUMENTO_VENTA";
        const visualString = `${String(cabecera.serie || '').trim()}-${String(cabecera.numero || cabecera.correlativo || '').trim()}`;
        const cliNombre = cabecera.cliente?.descripcion || cabecera.clienteDesc || 'SIN CLIENTE';

        setClienteNombre(cliNombre);
        setDocReferenciaVisible(visualString);

        setFormData(prev => ({
            ...prev,
            tipodoccomercialId: String(cabecera.tipodoccomercialId || '').trim(),
            doc_referencia: tablaReferencia,       
            doc_referencia_numero: realDocId,      
            monedaId: cabecera.monedaId || '001',
            tipo_cambio: cabecera.tipo_cambio || cabecera.tipoCambio || 1,
        }));
        
        toast.info("Procesando y calculando unidades disponibles...");
        
        try {
            const enrichedItems: InternalNotaSalidaDetalle[] = await Promise.all(
                detallesImportados.map(async (det: any, index: number) => {
                    const pId = String(det.bienId).trim();
                    let productoLabel = det.bien?.descripcion || det.bienDesc || 'Producto Desconocido';
                    
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
                    const precioBase = Number(det.precio ?? det.costo ?? 0);

                    // En importación usamos el saldo del documento como disponibilidad inicial.
                    // Evitamos consultar stock aquí porque ese endpoint no es estable para este flujo.
                    const stockReal = Number(det.saldoCantidad ?? det.saldo_cantidad ?? det.saldoTemporal ?? det.saldo_temporal ?? det.cantidad ?? 0);

                    return {
                        item: index + 1,
                        bienId: pId,
                        cantidad: cantidadDisponible,
                        cantidadMaxImportada: cantidadDisponible,
                        precio: precioBase,
                        importe: parseFloat((cantidadDisponible * precioBase).toFixed(2)),
                        presentacionId: presOriginal,
                        loteId: null,
                        descripcion_aux: productoLabel,
                        unidades_opciones: opcionesUM,
                        stockReal: stockReal
                    };
                })
            );

            const itemsValidos = enrichedItems.filter(i => i.cantidad > 0);

            if(itemsValidos.length === 0) {
                toast.warning("El documento seleccionado no tiene saldo disponible para salir.");
            } else {
                setItems(itemsValidos);
                setIsImportModalOpen(false);
                toast.success(`Documento cargado con ${itemsValidos.length} ítems disponibles.`);
            }
        } catch (error) {
            toast.error("Hubo un error al hidratar los detalles importados.");
        }
    };

    // --- GESTIÓN DE GRILLA EN LÍNEA ---
    const handleAddItem = () => {
        if (!formData.almacenId) return toast.warning("Seleccione un Almacén Origen primero.");
        if (!formData.transaccionId) return toast.warning("Seleccione un Tipo de Transacción primero.");
        if (transaccionRules.esCambioCodigo && items.length >= 1) return toast.error("En Cambio de Código solo se permite un producto a la vez.");
        
        setItems([...items, { 
            item: items.length + 1, bienId: '', cantidad: 1, precio: 0, importe: 0, 
            presentacionId: null, loteId: null, descripcion_aux: '', stockReal: 0, unidades_opciones: [],
            cantidadMaxImportada: undefined
        }]);
    };

    const handleRemoveItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index).map((it, i) => ({ ...it, item: i + 1 })));
        setLotesAsignados(prev => {
            const next: Record<number, any[]> = {};
            Object.entries(prev).forEach(([key, value]) => {
                const numericKey = Number(key);
                if (numericKey === index) return;
                next[numericKey > index ? numericKey - 1 : numericKey] = value;
            });
            return next;
        });
        if (activeLoteIndex !== null) {
            if (activeLoteIndex === index) {
                setActiveLoteIndex(null);
                setShowLoteModal(false);
                setLotesDisponibles([]);
                setLoteSearchTerm('');
                setLoteInput({ cantidad: 1 });
            } else if (activeLoteIndex > index) {
                setActiveLoteIndex(activeLoteIndex - 1);
            }
        }
        if (activeSCIndex !== null) {
            if (activeSCIndex === index) {
                setActiveSCIndex(null);
                setShowSCModal(false);
            } else if (activeSCIndex > index) {
                setActiveSCIndex(activeSCIndex - 1);
            }
        }
    };

    const checkStock = async (presId: string, index: number) => {
        if (!presId || !formData.almacenId) return;
        try {
            const res = await almacenLoteService.getByAlmacenYPresentacion(
                formData.almacenId,
                presId,
                1,
                1000,
                { Tipo: 'NS' }
            );

            const stockRecibido = res.isSuccess
                ? (res.data || []).reduce((acc: number, lote: any) => acc + Number(lote.stock_disponible || 0), 0)
                : 0;
            
            setItems(prev => {
                const updated = [...prev];
                updated[index].stockReal = stockRecibido;
                return updated;
            });
        } catch {
            setItems(prev => {
                const updated = [...prev];
                updated[index].stockReal = 0;
                return updated;
            });
        }
    };

    const handleItemChange = async (index: number, field: keyof InternalNotaSalidaDetalle, value: any) => {
        setItems(prev => {
            const updated = [...prev];
            const item = { ...updated[index], [field]: value };

            if (field === 'cantidad') {
                let numericVal = Number(value);
                if (!Number.isFinite(numericVal)) numericVal = 0;

                const assignedQty = (lotesAsignados[index] || []).reduce((acc, curr) => acc + Number(curr.cantidad || 0), 0);
                if (numericVal < assignedQty) {
                    toast.warning(`No puede ser menor a lo ya asignado en lotes (${assignedQty}).`);
                    numericVal = assignedQty;
                }

                if (isImportedData && item.cantidadMaxImportada !== undefined && item.cantidadMaxImportada !== null) {
                    const maxImp = Number(item.cantidadMaxImportada || 0);
                    if (numericVal > maxImp) {
                        toast.warning(`No puede exceder la cantidad importada (${maxImp}).`);
                        numericVal = maxImp;
                    }
                } else {
                    const stock = item.stockReal || 0;
                    if (numericVal > stock && !isImportedData) {
                        toast.warning(`Supera el stock disponible (${stock}).`);
                        numericVal = stock;
                    }
                }

                if (numericVal <= 0) numericVal = assignedQty > 0 ? assignedQty : 1;
                item.cantidad = numericVal;
            }

            if (field === 'cantidad' || field === 'precio') {
                const qty = Number(item.cantidad) || 0;
                const cost = Number(item.precio) || 0;
                item.importe = parseFloat((qty * cost).toFixed(2));
            }

            if (field === 'bienId') {
                item.unidades_opciones = [{ key: 'loading', presentacionId: '', value: 'Cargando...' }];
                item.precio = 0; 
                item.stockReal = 0;
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
                }

                setItems(prev => {
                    const updated = [...prev];
                    if (updated[index] && updated[index].bienId === value) {
                        updated[index].descripcion_aux = rawBienData ? rawBienData.descripcion : '';
                        updated[index].precio = rawBienData ? (rawBienData.costo || 0) : 0; 
                        updated[index].unidades_opciones = opcionesUM;
                        updated[index].presentacionId = opcionesUM[0]?.presentacionId || '';
                        updated[index].presentacionDestinoId = null;
                        updated[index].bienDestinoId = null;
                        updated[index].destinoLabel = '';
                        updated[index].cantidadDestino = 0;
                    }
                    return updated;
                });

                if (opcionesUM.length > 0) {
                    checkStock(opcionesUM[0].presentacionId, index);
                }
            } catch (error) {
                toast.error("Error al cargar datos del producto");
            }
        }

        if (field === 'presentacionId' && value) {
            checkStock(value, index);
            setItems(prev => {
                const updated = [...prev];
                if (!updated[index]) return prev;
                updated[index] = {
                    ...updated[index],
                    presentacionDestinoId: null,
                    bienDestinoId: transaccionRules.esCambioCodigo ? null : updated[index].bienDestinoId,
                    destinoLabel: '',
                    cantidadDestino: 0
                };
                return updated;
            });
        }

        if (field === 'cantidad' && transaccionRules.esCambioPresentacion) {
            setItems(prev => {
                const updated = [...prev];
                const current = updated[index];
                if (!current?.presentacionDestinoId) return prev;

                const presOrigen = current.unidades_opciones?.find((u: any) => u.presentacionId === current.presentacionId);
                const presDestino = current.unidades_opciones?.find((u: any) => u.presentacionId === current.presentacionDestinoId);

                const factorOrigen = Number(presOrigen?.cantidad_pres || 1);
                const factorDestino = Number(presDestino?.cantidad_pres || 1);
                const cantidadDestino = (Number(current.cantidad || 0) * factorOrigen) / factorDestino;

                updated[index] = {
                    ...current,
                    cantidadDestino: parseFloat(cantidadDestino.toFixed(4))
                };
                return updated;
            });
        }
    };

    // --- GESTIÓN CAMBIO DE CÓDIGO (SC) ---
    const handleOpenSC = (index: number) => {
        setActiveSCIndex(index);
        const item = items[index];
        const selectedUM = item.unidades_opciones?.find((u: any) => u.presentacionId === item.presentacionId);
        const factorOrigen = Number(selectedUM?.cantidad_pres || 1);
        setScInput({
            bienDestinoId: item.bienDestinoId || '',
            presentacionDestinoId: item.presentacionDestinoId || '',
            destinoLabel: item.destinoLabel || '',
            destinoAux: '',
            unidades_opciones: [],
            cantidadInicial: Number(item.cantidad) || 1,
            cantidadCalculada: Number(item.cantidad || 0),
            factorOrigen
        });
        setScSearchTerm('');
        setScSearchResults([]);
        setShowSCModal(true);
    };

    // 🚀 NUEVA LÓGICA: BUSCAR PRESENTACIONES EQUIVALENTES
    const handleSearchPresentacionEquivalente = async (term: string) => {
        if (activeSCIndex === null) return [];

        const itemOrigen = items[activeSCIndex];
        
        // 1. Buscamos la presentación original seleccionada
        const presentacionOrigen = itemOrigen.unidades_opciones?.find(
            (u: any) => u.presentacionId === itemOrigen.presentacionId
        );

        // 2. Extraemos su cantidad (factor de conversión)
        const cantidadObjetivo = presentacionOrigen?.cantidad_pres;

        if (!cantidadObjetivo) {
            toast.error("El producto original no tiene una presentación válida seleccionada.");
            return [];
        }

        try {
            // 3. Usamos el nuevo endpoint para traer SOLO presentaciones con esa misma cantidad
            const res = await presentacionService.getByCantidad(EMPRESA_ID, {
                Cantidad: cantidadObjetivo,
                SearchTerm: term,
                Estado: ['Activo', '1', 'true'] // Filtrar solo activos si tu DB lo requiere
            }, 1, 50);

            if (res.isSuccess && res.data) {
                // 4. Mapeamos la respuesta para el SearchableSelect
                return res.data
                    .filter((pres: any) => String(pres?.bienId || '').trim() !== String(itemOrigen?.bienId || '').trim())
                    .map((pres: any) => ({
                    key: `${pres.bienId}-${pres.presentacionId}`,
                    value: pres.bienId, // El value sigue siendo el bienId para guardarlo
                    label: `${pres.bien?.descripcion || 'Producto sin nombre'} - ${pres.descripcion}`, // Mostramos Producto + Presentacion
                    aux: pres.bien?.codigo_existencia || '',
                    presentacionId: pres.presentacionId,
                    cantidad_pres: Number(pres.cantidad || 1),
                    raw: pres,
                }));
            }
            return [];
        } catch (error) {
            console.error("Error al buscar presentaciones equivalentes", error);
            return [];
        }
    };

    useEffect(() => {
        if (!showSCModal) return;
        if (transaccionRules.esCambioPresentacion) return; // Solo SC
        if (activeSCIndex === null) return;

        const reqId = ++scSearchReqIdRef.current;
        setScSearchLoading(true);

        const timer = window.setTimeout(async () => {
            try {
                const res = await handleSearchPresentacionEquivalente(scSearchTerm);
                if (reqId !== scSearchReqIdRef.current) return;
                setScSearchResults(res || []);
            } catch {
                if (reqId !== scSearchReqIdRef.current) return;
                setScSearchResults([]);
            } finally {
                if (reqId === scSearchReqIdRef.current) setScSearchLoading(false);
            }
        }, 300);

        return () => {
            window.clearTimeout(timer);
        };
    }, [showSCModal, transaccionRules.esCambioPresentacion, activeSCIndex, scSearchTerm]);

    const handleProductDestinoSelect = (e: any, opt: any) => {
        if (!opt) return;

        const cantidadCalculada = Number(scInput.cantidadInicial || 0);
        setScInput(prev => ({ 
            ...prev, 
            bienDestinoId: opt.value, 
            destinoLabel: opt.label, 
            destinoAux: String(opt.aux || '').trim(),
            presentacionDestinoId: opt.presentacionId,
            cantidadCalculada,
            unidades_opciones: [{
                key: opt.presentacionId || '',
                value: opt.label || '',
                presentacionId: opt.presentacionId,
                cantidad_pres: Number(opt.cantidad_pres || 1)
            }] 
        }));
    };
    // --- GESTIÓN CAMBIO DE PRESENTACIÓN (XP) ---
    const handleOpenXP = (index: number) => {
        setActiveSCIndex(index);
        const item = items[index];
        const presOrigen = item.unidades_opciones?.find((u: any) => u.presentacionId === item.presentacionId);
        const factorOrigen = Number(presOrigen?.cantidad_pres || 1);

        // 🚀 Filtramos las opciones para excluir la presentación actual (origen)
        const opcionesDestino = (item.unidades_opciones || []).filter(
            u => u.presentacionId !== item.presentacionId
        );

        setScInput({
            bienDestinoId: item.bienId, // El producto es el mismo
            presentacionDestinoId: item.presentacionDestinoId || '',
            destinoLabel: item.destinoLabel || '',
            destinoAux: '',
            unidades_opciones: opcionesDestino,
            cantidadInicial: Number(item.cantidad) || 1,
            cantidadCalculada: Number(item.cantidadDestino || 0),
            factorOrigen
        });
        setXpSearchTerm('');
        setShowSCModal(true);
    };

    const handlePresentacionDestinoChange = (presDestinoId: string) => {
        const itemOrigen = items[activeSCIndex!];
        
        // Buscamos los factores (cantidad_pres) de Origen y Destino
        const presOrigen = itemOrigen.unidades_opciones?.find(u => u.presentacionId === itemOrigen.presentacionId);
        const presDestino = scInput.unidades_opciones?.find(u => u.presentacionId === presDestinoId);

        const factorOrigen = presOrigen?.cantidad_pres || 1;
        const factorDestino = presDestino?.cantidad_pres || 1;

        // 🚀 LA FÓRMULA MATEMÁTICA EXACTA DE TU ASP.NET
        const cantidadConvertida = (Number(scInput.cantidadInicial) * Number(factorOrigen)) / Number(factorDestino);

        setScInput(prev => ({
            ...prev,
            presentacionDestinoId: presDestinoId,
            destinoLabel: presDestino?.value || '',
            cantidadCalculada: parseFloat(cantidadConvertida.toFixed(4))
        }));
    };

    const handleXPCantidadChange = (val: number) => {
        const cantidadInicial = Number.isFinite(val) ? Number(val) : 0;
        let calc = 0;
        if (scInput.presentacionDestinoId) {
            const presDestino = scInput.unidades_opciones.find((u: any) => u.presentacionId === scInput.presentacionDestinoId);
            const factorDestino = Number(presDestino?.cantidad_pres || 1);
            calc = (cantidadInicial * Number(scInput.factorOrigen || 1)) / factorDestino;
        }

        setScInput(prev => ({
            ...prev,
            cantidadInicial: cantidadInicial,
            cantidadCalculada: parseFloat(calc.toFixed(4))
        }));
    };

    // Mantiene XP 100% dinámico: si el usuario cambia la cantidad después de elegir destino,
    // recalculamos automáticamente (sin depender del orden de pasos).
    useEffect(() => {
        if (!showSCModal) return;
        if (!transaccionRules.esCambioPresentacion) return;
        if (!scInput.presentacionDestinoId) return;

        const presDestino = scInput.unidades_opciones.find((u: any) => u.presentacionId === scInput.presentacionDestinoId);
        const factorDestino = Number(presDestino?.cantidad_pres || 1);
        if (!factorDestino) return;

        const calc = (Number(scInput.cantidadInicial || 0) * Number(scInput.factorOrigen || 1)) / factorDestino;
        const next = parseFloat(calc.toFixed(4));
        if (Number(scInput.cantidadCalculada || 0) === next) return;

        setScInput(prev => ({ ...prev, cantidadCalculada: next }));
    }, [
        showSCModal,
        transaccionRules.esCambioPresentacion,
        scInput.cantidadInicial,
        scInput.factorOrigen,
        scInput.presentacionDestinoId,
        scInput.unidades_opciones,
        scInput.cantidadCalculada
    ]);

    const handleSaveXPDestino = () => {
        if (!scInput.presentacionDestinoId) {
            return toast.warning("Debe seleccionar una presentación de destino.");
        }
        if (Number(scInput.cantidadInicial) <= 0) {
            return toast.warning("La cantidad a convertir debe ser mayor a cero.");
        }
        if (activeSCIndex === null) return;
        const itemOrigen = items[activeSCIndex];
        if (!itemOrigen) return;
        if (String(itemOrigen.presentacionId) === String(scInput.presentacionDestinoId)) {
            return toast.warning("La presentación destino no puede ser igual a la presentación origen.");
        }
        if (Number(scInput.cantidadInicial) > Number(itemOrigen.stockReal || 0)) {
            return toast.error(`No puede convertir más de lo que tiene en stock (${itemOrigen.stockReal || 0}).`);
        }
        const newItems = [...items];
        newItems[activeSCIndex!] = { 
            ...newItems[activeSCIndex!], 
            bienDestinoId: scInput.bienDestinoId, 
            presentacionDestinoId: scInput.presentacionDestinoId, 
            destinoLabel: scInput.destinoLabel,
            cantidad: scInput.cantidadInicial,
            importe: parseFloat((Number(scInput.cantidadInicial) * Number(newItems[activeSCIndex!].precio || 0)).toFixed(2)),
            cantidadDestino: scInput.cantidadCalculada
        };
        setItems(newItems);
        setShowSCModal(false);
        toast.success("Cambio de presentación calculado correctamente.");
    };

    const handleSaveSCDestino = () => {
        if (!scInput.bienDestinoId || !scInput.presentacionDestinoId) {
            return toast.warning("Debe seleccionar un producto de destino equivalente.");
        }
        if (Number(scInput.cantidadInicial) <= 0) {
            return toast.warning("La cantidad a convertir debe ser mayor a cero.");
        }
        if (activeSCIndex === null) return;
        const itemOrigen = items[activeSCIndex];
        if (!itemOrigen) return;
        if (Number(scInput.cantidadInicial) > Number(itemOrigen.stockReal || 0)) {
            return toast.error(`No puede convertir más de lo que tiene en stock (${itemOrigen.stockReal || 0}).`);
        }
        const newItems = [...items];
        newItems[activeSCIndex!] = { 
            ...newItems[activeSCIndex!], 
            cantidad: scInput.cantidadInicial,
            importe: parseFloat((Number(scInput.cantidadInicial) * Number(newItems[activeSCIndex!].precio || 0)).toFixed(2)),
            bienDestinoId: scInput.bienDestinoId, 
            presentacionDestinoId: scInput.presentacionDestinoId, 
            destinoLabel: scInput.destinoLabel 
        };
        setItems(newItems);
        setShowSCModal(false);
        toast.success("Conversión configurada con presentación equivalente.");
    };

    // --- GESTIÓN DE LOTES (Distribución Salida) ---
    const handleOpenLotes = (index: number) => {
        const item = items[index];
        if (!formData.almacenId) return toast.warning("Seleccione un Almacén Origen primero.");
        if (!item.bienId || !item.presentacionId) return toast.warning("Seleccione un producto y presentación primero.");
        if (transaccionRules.esCambioCodigo) {
            const ok = !!item.bienDestinoId && !!item.presentacionDestinoId;
            if (!ok) return toast.warning("Primero configure el destino (SC) y luego asigne lotes.");
        }
        if (transaccionRules.esCambioPresentacion) {
            const ok = !!item.presentacionDestinoId && Number(item.cantidadDestino || 0) > 0;
            if (!ok) return toast.warning("Primero configure la conversión (XP) y luego asigne lotes.");
        }
        setActiveLoteIndex(index);
        setLoteSearchTerm('');
        setLoteInput({ cantidad: 1 });
        setShowLoteModal(true);
        fetchLotesDisponibles(index, '');
    };

    const activeItem = activeLoteIndex !== null ? items[activeLoteIndex] : null;
    const activeItemLotes = activeLoteIndex !== null ? (lotesAsignados[activeLoteIndex] || []) : [];
    const activeItemQty = activeItem ? Number(activeItem.cantidad || 0) : 0;
    const assignedQty = activeItemLotes.reduce((acc, curr) => acc + Number(curr.cantidad), 0);
    const pendingQty = activeItemQty - assignedQty;

    const fetchLotesDisponibles = async (index: number, search: string = '') => {
        const item = items[index];
        if (!formData.almacenId || !item?.presentacionId) {
            setLotesDisponibles([]);
            return;
        }

        setLoadingLotes(true);
        try {
            const res = await almacenLoteService.getByAlmacenYPresentacion(
                formData.almacenId,
                String(item.presentacionId),
                1,
                1000,
                { Tipo: 'NS', SearchTerm: search }
            );

            if (res.isSuccess) {
                const mappedLotes = (res.data || [])
                    .map((l: any) => ({
                        value: l.loteId,
                        label: l.descripcion || l.codigo_lote_importacion || l.loteId,
                        aux: Number(l.stock_disponible || 0),
                        raw: l
                    }))
                    .sort((a: any, b: any) => Number(b.aux || 0) - Number(a.aux || 0));

                setLotesDisponibles(mappedLotes);
            } else {
                setLotesDisponibles([]);
            }
        } catch {
            toast.error("Error al cargar lotes disponibles.");
            setLotesDisponibles([]);
        } finally {
            setLoadingLotes(false);
        }
    };

    const handleLoteSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setLoteSearchTerm(val);
        if (loteSearchTimeoutRef.current) clearTimeout(loteSearchTimeoutRef.current);
        loteSearchTimeoutRef.current = setTimeout(() => {
            if (activeLoteIndex !== null) fetchLotesDisponibles(activeLoteIndex, val);
        }, 400);
    };

    const handleAssignLoteDisponible = (lote: any) => {
        const cantidadSolicitada = Number(loteInput.cantidad) || 0;
        const stockDisponible = Number(lote.raw?.stock_disponible || 0);

        if (!lote?.value) return toast.warning("Seleccione un lote válido.");
        if (cantidadSolicitada <= 0) return toast.warning("La cantidad debe ser mayor a 0.");
        if (cantidadSolicitada > pendingQty) return toast.error(`Solo requiere asignar ${pendingQty} a este lote.`);
        if (cantidadSolicitada > stockDisponible) return toast.error(`El lote solo tiene ${stockDisponible} disponibles.`);

        setLotesAsignados(prev => {
            const current = prev[activeLoteIndex!] || [];
            const existe = current.find(x => x.loteId === lote.value);
            if (existe) {
                return {
                    ...prev,
                    [activeLoteIndex!]: current.map(x =>
                        x.loteId === lote.value
                            ? { ...x, cantidad: Number(x.cantidad) + cantidadSolicitada, stockDisponible }
                            : x
                    )
                };
            }
            return {
                ...prev,
                [activeLoteIndex!]: [
                    ...current,
                    {
                        loteId: lote.value,
                        loteLabel: lote.label,
                        cantidad: cantidadSolicitada,
                        stockDisponible
                    }
                ]
            };
        });
        setLoteInput({ cantidad: 1 });
        toast.success(`Lote ${lote.value} asignado.`);
    };

    const handleRemoveLoteFromItem = (loteId: string) => {
        setLotesAsignados(prev => ({ ...prev, [activeLoteIndex!]: (prev[activeLoteIndex!] || []).filter(x => x.loteId !== loteId) }));
    };

    // --- GUARDAR NOTA ---
    const handleSubmit = async () => {
        if (!formData.almacenId) return toast.error("Seleccione el Almacén Origen.");
        if (!formData.transaccionId) return toast.error("Seleccione un Tipo de Transacción.");
        if (transaccionRules.esTrasladoInterno && !formData.almacenDestinoId) return toast.error("Seleccione el Almacén de Destino.");
        if ((transaccionRules.esCambioCodigo || transaccionRules.esCambioPresentacion) && selectedAlmacenTipo !== '3') {
            return toast.error("Para esta transacción el almacén origen debe ser tipo 3.");
        }
        if (items.length === 0) return toast.error("Debe agregar al menos un producto.");
        
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            if (!item.bienId) return toast.error(`La fila ${i + 1} no tiene un producto seleccionado.`);
            if (item.cantidad <= 0) return toast.error(`La cantidad en la fila ${i + 1} debe ser mayor a cero.`);
            
            if (transaccionRules.esCambioCodigo && !item.bienDestinoId) {
                return toast.error("En Cambio de Código (SC) debe configurar el Producto Destino (Clic en el ícono verde).");
            }
            if (transaccionRules.esCambioPresentacion) {
                if (!item.presentacionDestinoId) return toast.error(`En Cambio de Presentación (XP) debe configurar la Presentación Destino en la fila ${i + 1}.`);
                if (String(item.presentacionDestinoId) === String(item.presentacionId)) {
                    return toast.error(`La fila ${i + 1} tiene la misma presentación origen y destino.`);
                }
                if (Number(item.cantidadDestino || 0) <= 0) {
                    return toast.error(`La fila ${i + 1} no tiene una conversión válida de presentación.`);
                }
            }
        }

        setLoading(true);
        try {
            const detallesExpandidos: NotaSalidaDetalle[] = [];
            let itemCounter = 1;

            items.forEach((it, idx) => {
                const lotes = lotesAsignados[idx] || [];
                if (lotes.length > 0) {
                    lotes.forEach(lote => {
                        detallesExpandidos.push({
                            ...it, item: itemCounter++, cantidad: lote.cantidad,
                            importe: Number((lote.cantidad * it.precio).toFixed(2)), loteId: lote.loteId
                        });
                    });
                } else {
                    detallesExpandidos.push({ ...it, item: itemCounter++ });
                }
            });

            const payload: NotaSalidaPayload = {
                transaccionId: formData.transaccionId,
                monedaId: formData.monedaId || '001',
                tipo_cambio: Number(formData.tipo_cambio) || 1,
                tipodoccomercialId: formData.tipodoccomercialId || '',
                doc_referencia: formData.doc_referencia || '', 
                doc_referencia_numero: transaccionRules.esCambioCodigo ? `${items[0].bienDestinoId}|${items[0].presentacionDestinoId}` : (formData.doc_referencia_numero || ''),
                almacenId: formData.almacenId || '',
                almacenDestinoId: formData.almacenDestinoId,
                estado: formData.estado || 'REGISTRADO',
                cuentausuario: formData.cuentausuario || USER_ID,
                observaciones: formData.observaciones || '',
                empresaId: EMPRESA_ID,
                detalles: detallesExpandidos
            };

            const res = await notaSalidaService.create(payload);
            if (res.isSuccess) {
                if (transaccionRules.esCambioPresentacion) {
                    const ingresoTransaccionId = String(ingresoCambioPresentacion?.value || '').trim();
                    if (!ingresoTransaccionId) {
                        throw new Error("No se encontró la transacción 'INGRESO POR CAMBIO DE PRESENTACION'.");
                    }

                    const notaSalidaId = String(res.data?.notaSalidaId || res.data?.notassalidaId || res.data?.id || '');
                    const detallesIngreso = detallesExpandidos.map((det, idx) => {
                        const presOrigen = (det.unidades_opciones || []).find((u: any) => u.presentacionId === det.presentacionId);
                        const presDestino = (det.unidades_opciones || []).find((u: any) => u.presentacionId === (det as any).presentacionDestinoId);
                        const factorOrigen = Number(presOrigen?.cantidad_pres || 1);
                        const factorDestino = Number(presDestino?.cantidad_pres || 1);
                        if (!factorDestino) {
                            throw new Error("La presentación destino no tiene un factor válido para conversión.");
                        }
                        const cantidadConvertida = (Number(det.cantidad || 0) * factorOrigen) / factorDestino;

                        return {
                            item: idx + 1,
                            bienId: det.bienId,
                            cantidad: parseFloat(cantidadConvertida.toFixed(4)),
                            costo: Number(det.precio || 0),
                            importe: parseFloat((cantidadConvertida * Number(det.precio || 0)).toFixed(2)),
                            presentacionId: (det as any).presentacionDestinoId || null,
                            loteId: det.loteId || null
                        };
                    });

                    if (detallesIngreso.some((d: any) => !d.loteId)) {
                        throw new Error("La gestión de lotes está activa: todos los detalles del ingreso deben tener un lote asignado.");
                    }

                    const ingresoPayload = {
                        transaccionId: ingresoTransaccionId,
                        monedaId: formData.monedaId || '001',
                        tipo_cambio: Number(formData.tipo_cambio) || 1,
                        tipodoccomercialId: '',
                        doc_referencia: 'NOTA_SALIDA',
                        doc_referencia_numero: notaSalidaId,
                        almacenId: formData.almacenId || '',
                        estado: formData.estado || 'REGISTRADO',
                        cuentausuario: formData.cuentausuario || USER_ID,
                        observaciones: 'Ingreso automático por cambio de presentación desde XP',
                        nro_contenedor: '',
                        empresaId: EMPRESA_ID,
                        detalles: detallesIngreso
                    };

                    const resIngreso = await notaIngresoService.create(ingresoPayload as any);
                    if (!resIngreso.isSuccess) {
                        throw new Error(resIngreso.message || "Se generó la salida pero falló la nota de entrada automática.");
                    }
                }
                toast.success("Nota de Salida generada exitosamente.");
                router.push('/dashboard/notas-salida');
            } else {
                toast.error(res.message || "Error al generar la salida.");
            }
        } catch (error) {
            toast.error("Error crítico al enviar los datos.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 max-w-[95%] mx-auto pb-20 animate-fade-in-up">
            
            {/* CABECERA */}
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                        <IconArrowLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Nueva Nota de Salida</h1>
                        <p className="text-xs text-slate-500">Despachos, Consumos y Traslados</p>
                    </div>
                </div>
                <div className="flex gap-3 items-center">
                    {isImportedData && (
                        <button 
                            type="button" onClick={handleClearForm}
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
                
                {/* COLUMNA IZQUIERDA */}
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
                                    placeholder="Seleccione un almacén de productos terminados"
                                />
                            </div>

                            <div className={transaccionRules.allowImportDocs || transaccionRules.esTrasladoInterno ? "md:col-span-2" : "md:col-span-1"}>
                                <SearchableSelect 
                                    label="Tipo Transacción *" 
                                    name="transaccionId"
                                    options={transaccionOptions}
                                    value={formData.transaccionId || ''} 
                                    onChange={handleChange}
                                    disabled={!formData.almacenId}
                                />
                            </div>

                            {transaccionRules.esTrasladoInterno && (
                                <div className="md:col-span-2 p-4 bg-orange-50 border border-orange-200 rounded-xl animate-in fade-in zoom-in-95">
                                    <div className="flex items-center gap-2 text-orange-700 font-bold text-xs mb-2">
                                        <IconBuildingStore size={16} /> Almacén Destino (Traslado)
                                    </div>
                                    <SearchableSelect 
                                        name="almacenDestinoId"
                                        options={almacenDestinoOptions}
                                        value={formData.almacenDestinoId || ''} 
                                        onChange={handleChange}
                                        placeholder="Seleccione almacén receptor..."
                                    />
                                </div>
                            )}

                            {isImportedData && (
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

                    {/* GRILLA EN LÍNEA */}
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
                                        <th className="p-3 w-16 text-center">Lotes</th>
                                        <th className="p-3 w-16 text-center">Acc.</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {items.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="p-8 text-center text-slate-400 italic">
                                                No hay items. {isImportedData ? 'El documento no contiene detalles.' : 'Agregue productos al detalle.'}
                                            </td>
                                        </tr>
                                    ) : (
                                        items.map((item: any, idx) => {
                                            
                                            const selectedUM = item.unidades_opciones?.find((u: any) => u.presentacionId === item.presentacionId);
                                            const factor = selectedUM?.cantidad_pres || 1;
                                            const conversionTotal = (Number(item.cantidad) * factor).toFixed(2);
                                            const hasStockError = item.cantidad > (item.stockReal || 0);
                                            const lotesSum = (lotesAsignados[idx] || []).reduce((acc, curr) => acc + Number(curr.cantidad), 0);
                                            const isLoteComplete = lotesSum === item.cantidad;
                                            const isCambioTx = transaccionRules.esCambioCodigo || transaccionRules.esCambioPresentacion;
                                            const isCambioReady = !isCambioTx
                                                ? true
                                                : transaccionRules.esCambioCodigo
                                                    ? !!item.bienDestinoId && !!item.presentacionDestinoId
                                                    : !!item.presentacionDestinoId && Number(item.cantidadDestino || 0) > 0;

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
                                                        {(transaccionRules.esCambioCodigo || transaccionRules.esCambioPresentacion) && item.destinoLabel && (
                                                            <p className="text-[10px] text-emerald-600 font-bold flex items-center gap-1 mt-1">
                                                                <IconExchange size={12} /> {transaccionRules.esCambioPresentacion ? `Presentación destino: ${item.destinoLabel}` : `Convertir a: ${item.destinoLabel}`}
                                                            </p>
                                                        )}
                                                        {transaccionRules.esCambioPresentacion && Number(item.cantidadDestino || 0) > 0 && (
                                                            <p className="text-[10px] text-blue-600 font-bold flex items-center gap-1 mt-1">
                                                                <IconExchange size={12} /> Generará: {Number(item.cantidadDestino).toFixed(4)} unidades
                                                            </p>
                                                        )}
                                                    </td>
                                                    <td className="p-3">
                                                        <select 
                                                            className="w-full border border-slate-200 p-1.5 rounded outline-none focus:ring-1 focus:ring-blue-400 bg-white shadow-sm"
                                                            value={item.presentacionId || ''} 
                                                            onChange={(e: any) => handleItemChange(idx, 'presentacionId', e.target.value)}
                                                            disabled={isImportedData || !item.unidades_opciones || item.unidades_opciones.length === 0}
                                                        >
                                                            {item.unidades_opciones?.map((u: any) => (
                                                                <option key={u.key} value={u.presentacionId}>{u.value}</option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td className="p-3">
                                                        <div className="relative">
                                                            <input 
                                                                type="number" 
                                                                className={`w-full border p-1.5 text-right rounded outline-none focus:ring-1 shadow-sm transition-colors
                                                                    ${hasStockError && !isImportedData
                                                                        ? 'border-red-500 focus:border-red-500 focus:ring-red-500 text-red-600 bg-red-50' 
                                                                        : 'border-slate-200 focus:border-blue-400 focus:ring-blue-400 bg-white'}`} 
                                                                min="1" 
                                                                value={item.cantidad} 
                                                                onChange={(e) => handleItemChange(idx, 'cantidad', e.target.value)} 
                                                            />
                                                            {!isImportedData && item.stockReal !== undefined && (
                                                                <span className={`absolute -top-3.5 right-0 text-[8px] font-bold ${hasStockError ? 'text-red-500' : 'text-emerald-600'}`}>
                                                                    Stk: {item.stockReal}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    
                                                    <td className="p-3 text-right">
                                                        <div className="w-full bg-slate-100 border border-slate-200 p-1.5 rounded font-bold text-slate-500 truncate cursor-not-allowed">
                                                            {conversionTotal}
                                                        </div>
                                                    </td>

                                                    <td className="p-3 text-center">
                                                        <div className="flex items-center justify-center gap-1">
                                                            {isCambioTx && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => transaccionRules.esCambioPresentacion ? handleOpenXP(idx) : handleOpenSC(idx)}
                                                                    title={transaccionRules.esCambioPresentacion ? "Configurar conversión (XP)" : "Configurar destino (SC)"}
                                                                    className="p-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 transition-colors rounded border border-emerald-200 shadow-sm"
                                                                >
                                                                    <IconExchange size={16} />
                                                                </button>
                                                            )}
                                                            <button 
                                                                type="button"
                                                                disabled={isCambioTx && !isCambioReady}
                                                                onClick={() => handleOpenLotes(idx)} 
                                                                title={isCambioTx && !isCambioReady ? "Primero configure el destino y luego asigne lotes" : "Distribución de lotes"}
                                                                className={`px-2 py-1.5 rounded text-[10px] font-bold transition-all shadow-sm border w-full flex justify-center items-center
                                                                    ${isCambioTx && !isCambioReady
                                                                        ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                                                                        : isLoteComplete && item.loteId 
                                                                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200' 
                                                                            : 'bg-slate-50 text-slate-600 hover:bg-blue-50 hover:text-blue-700 border-slate-200'}`}
                                                            >
                                                                <IconListDetails size={14} className="mr-1" />
                                                                {isLoteComplete ? 'OK' : 'Lotes'}
                                                            </button>
                                                        </div>
                                                    </td>
                                                    <td className="p-3 text-center flex justify-center gap-1">
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

                {/* COLUMNA DERECHA */}
                <div className="col-span-12 lg:col-span-4 space-y-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 sticky top-4">
                        <SectionTitle title="Entidad y Extras" icon={IconBuildingStore} />
                        <div className="space-y-4">
                            
                            {isImportedData && (
                                <div className="animate-in fade-in zoom-in-95">
                                    <FormInput 
                                        label="Cliente/Proveedor Asignado" 
                                        value={clienteNombre} 
                                        disabled={true}
                                        className="bg-slate-50 border-slate-200 text-slate-600 uppercase font-semibold"
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

            {/* MODAL CAMBIO DE CÓDIGO / PRESENTACIÓN */}
            <Modal
                isOpen={showSCModal}
                onClose={() => {
                    setShowSCModal(false);
                    setScSearchLoading(false);
                    setScSearchTerm('');
                    setScSearchResults([]);
                    setXpSearchTerm('');
                }}
                title={transaccionRules.esCambioPresentacion ? "Cambio de Presentación (XP)" : "Conversión de Código (SC)"}
                size="xl"
            >
                {transaccionRules.esCambioPresentacion ? (
                    <div className="p-5 space-y-5">
                        <div className="bg-amber-50 text-amber-800 p-4 rounded-xl border border-amber-200">
                            <p className="text-xs font-bold uppercase mb-1">Producto Origen (A Descontar)</p>
                            <p className="text-sm font-semibold">{activeSCIndex !== null ? items[activeSCIndex].descripcion_aux : ''}</p>
                            <div className="flex gap-4 mt-3">
                                <FormInput 
                                    label="Cantidad a Convertir" type="number" min="0.01" step="0.01"
                                    value={scInput.cantidadInicial}
                                    onChange={(e: any) => handleXPCantidadChange(Number(e.target.value))}
                                    className="bg-white border-amber-300 font-bold text-amber-900"
                                />
                                <div className="flex-1">
                                    <label className="text-[10px] font-bold text-amber-600 uppercase ml-1">Presentación Origen</label>
                                    <div className="p-2.5 bg-amber-100 rounded-lg text-xs font-bold text-amber-900 truncate">
                                        {activeSCIndex !== null ? items[activeSCIndex].unidades_opciones?.find((u: any) => u.presentacionId === items[activeSCIndex].presentacionId)?.value : ''}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-center -my-3 relative z-10">
                            <div className="bg-white p-2 rounded-full border border-slate-200 shadow-sm text-slate-400">
                                <IconExchange size={20} />
                            </div>
                        </div>

                        <div className="bg-emerald-50 text-emerald-800 p-4 rounded-xl border border-emerald-200">
                            <div className="flex items-center justify-between gap-3 mb-3">
                                <div>
                                    <p className="text-xs font-bold uppercase text-emerald-600">Presentación Destino (A Ingresar)</p>
                                    <p className="text-[11px] text-emerald-700/80">
                                        Seleccione la presentación destino del mismo producto. El cálculo se actualiza en vivo.
                                    </p>
                                </div>
                                <div className="text-[11px] font-bold text-emerald-700 bg-white/60 border border-emerald-200 px-3 py-1.5 rounded-lg">
                                    {(() => {
                                        const term = xpSearchTerm.trim().toLowerCase();
                                        const total = scInput.unidades_opciones.length;
                                        const shown = !term
                                            ? total
                                            : scInput.unidades_opciones.filter((u: any) => {
                                                const text = `${String(u?.value || '')} ${String(u?.presentacionId || '')}`.toLowerCase();
                                                return text.includes(term);
                                            }).length;
                                        return `${shown} de ${total}`;
                                    })()}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                                <div className="lg:col-span-8 space-y-3">
                                    <div className="relative">
                                        <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-700/50" />
                                        <input
                                            type="text"
                                            value={xpSearchTerm}
                                            onChange={(e) => setXpSearchTerm(e.target.value)}
                                            placeholder="Buscar presentación destino..."
                                            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-emerald-200 bg-white text-xs outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400"
                                        />
                                    </div>

                                    <div className="border border-emerald-200 bg-white rounded-xl overflow-hidden">
                                        <div className="max-h-[360px] overflow-y-auto">
                                            <table className="w-full text-left text-xs">
                                                <thead className="bg-emerald-100/60 text-emerald-900 sticky top-0 z-10">
                                                    <tr>
                                                        <th className="p-3">Presentación</th>
                                                        <th className="p-3 w-28 text-right">Factor</th>
                                                        <th className="p-3 w-36 text-right">Generará</th>
                                                        <th className="p-3 w-24 text-center">Acción</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-emerald-50">
                                                    {(() => {
                                                        const term = xpSearchTerm.trim().toLowerCase();
                                                        const opts = !term
                                                            ? scInput.unidades_opciones
                                                            : scInput.unidades_opciones.filter((u: any) => {
                                                                const text = `${String(u?.value || '')} ${String(u?.presentacionId || '')}`.toLowerCase();
                                                                return text.includes(term);
                                                            });

                                                        if (opts.length === 0) {
                                                            return (
                                                                <tr>
                                                                    <td colSpan={4} className="p-8 text-center text-slate-400 italic">
                                                                        No hay resultados para ese filtro.
                                                                    </td>
                                                                </tr>
                                                            );
                                                        }

                                                        return opts.map((u: any) => {
                                                            const isSelected = String(u?.presentacionId || '') === String(scInput.presentacionDestinoId || '');
                                                            const factorDestino = Number(u?.cantidad_pres || 1);
                                                            const calc = factorDestino
                                                                ? (Number(scInput.cantidadInicial || 0) * Number(scInput.factorOrigen || 1)) / factorDestino
                                                                : 0;

                                                            return (
                                                                <tr
                                                                    key={String(u?.key || u?.presentacionId || '')}
                                                                    className={isSelected ? 'bg-emerald-50' : 'hover:bg-slate-50'}
                                                                >
                                                                    <td className="p-3">
                                                                        <div className="font-semibold text-slate-700 uppercase truncate" title={String(u?.value || '')}>
                                                                            {String(u?.value || '')}
                                                                        </div>
                                                                    </td>
                                                                    <td className="p-3 text-right font-mono text-slate-600">
                                                                        {Number(factorDestino || 0).toFixed(2)}
                                                                    </td>
                                                                    <td className="p-3 text-right font-mono font-bold text-emerald-700">
                                                                        {Number(calc || 0).toFixed(4)}
                                                                    </td>
                                                                    <td className="p-3 text-center">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handlePresentacionDestinoChange(String(u.presentacionId))}
                                                                            className={`px-3 py-1.5 rounded-lg font-bold border transition-colors ${
                                                                                isSelected
                                                                                    ? 'bg-emerald-600 text-white border-emerald-600'
                                                                                    : 'bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50'
                                                                            }`}
                                                                        >
                                                                            {isSelected ? 'Elegido' : 'Elegir'}
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        });
                                                    })()}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>

                                <div className="lg:col-span-4 space-y-3">
                                    <div className="bg-white/70 border border-emerald-200 rounded-xl p-4">
                                        <p className="text-[10px] font-bold text-emerald-700 uppercase mb-2">Selección Actual</p>
                                        {scInput.presentacionDestinoId ? (
                                            <>
                                                <p className="text-xs font-black text-slate-800 uppercase truncate" title={scInput.destinoLabel}>
                                                    {scInput.destinoLabel || '-'}
                                                </p>
                                                <div className="mt-2 text-[11px] text-slate-600">
                                                    {(() => {
                                                        const presDestino = scInput.unidades_opciones.find((u: any) => u.presentacionId === scInput.presentacionDestinoId);
                                                        const factorDestino = Number(presDestino?.cantidad_pres || 0);
                                                        return factorDestino
                                                            ? <>Factor destino: <span className="font-mono font-bold">{factorDestino.toFixed(2)}</span></>
                                                            : <>Factor destino: <span className="font-mono font-bold">-</span></>;
                                                    })()}
                                                </div>
                                            </>
                                        ) : (
                                            <p className="text-xs text-slate-500 italic">Aún no selecciona una presentación destino.</p>
                                        )}
                                    </div>

                                    <div className="bg-white/70 border border-emerald-200 rounded-xl p-4">
                                        <p className="text-[10px] font-bold text-emerald-700 uppercase mb-2">Resultado</p>
                                        <div className="p-2.5 bg-emerald-600 rounded-lg text-lg text-center font-black text-white shadow-inner">
                                            {Number(scInput.cantidadCalculada || 0).toFixed(4)}{' '}
                                            <span className="text-[10px] font-normal opacity-80 uppercase">Unidades</span>
                                        </div>
                                        <div className="mt-2 text-[11px] text-slate-600">
                                            Formula: <span className="font-mono font-bold">(Cantidad * FactorOrigen) / FactorDestino</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end pt-2 border-t border-slate-100 gap-2">
                            <button onClick={() => setShowSCModal(false)} className="px-5 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors">
                                Cancelar
                            </button>
                            <button 
                                onClick={handleSaveXPDestino}
                                disabled={!scInput.presentacionDestinoId}
                                className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-md shadow-blue-200 flex items-center gap-2"
                            >
                                <IconDeviceFloppy size={18} /> Confirmar Conversión
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="p-5 space-y-5">
                        <div className="bg-amber-50 text-amber-800 p-4 rounded-xl border border-amber-200">
                            <p className="text-xs font-bold uppercase mb-1">Producto Origen (A Descontar)</p>
                            <p className="text-sm font-semibold">{activeSCIndex !== null ? items[activeSCIndex].descripcion_aux : ''}</p>
                            <div className="flex gap-4 mt-3">
                                <FormInput 
                                    label="Cantidad a Convertir" type="number" min="0.01" step="0.01"
                                    value={scInput.cantidadInicial}
                                    onChange={(e: any) => {
                                        const qty = Number(e.target.value);
                                        setScInput(prev => ({
                                            ...prev,
                                            cantidadInicial: qty,
                                            cantidadCalculada: Number.isFinite(qty) ? qty : 0
                                        }));
                                    }}
                                    className="bg-white border-amber-300 font-bold text-amber-900"
                                />
                                <div className="flex-1">
                                    <label className="text-[10px] font-bold text-amber-600 uppercase ml-1">Presentación Origen</label>
                                    <div className="p-2.5 bg-amber-100 rounded-lg text-xs font-bold text-amber-900 truncate">
                                        {activeSCIndex !== null ? items[activeSCIndex].unidades_opciones?.find((u: any) => u.presentacionId === items[activeSCIndex].presentacionId)?.value : ''}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-center -my-3 relative z-10">
                            <div className="bg-white p-2 rounded-full border border-slate-200 shadow-sm text-slate-400">
                                <IconExchange size={20} />
                            </div>
                        </div>

                        <div className="bg-emerald-50 text-emerald-800 p-4 rounded-xl border border-emerald-200">
                            <div className="flex items-center justify-between gap-3 mb-3">
                                <div>
                                    <p className="text-xs font-bold uppercase text-emerald-600">Producto Destino (A Ingresar)</p>
                                    <p className="text-[11px] text-emerald-700/80">
                                        Busque y seleccione una presentación equivalente. Esta lista es grande, por eso se muestra en tabla.
                                    </p>
                                </div>
                                <div className="text-[11px] font-bold text-emerald-700 bg-white/60 border border-emerald-200 px-3 py-1.5 rounded-lg">
                                    {scSearchLoading ? 'Buscando...' : `${scSearchResults.length} resultados`}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                                <div className="lg:col-span-8 space-y-3">
                                    <div className="relative">
                                        <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-700/50" />
                                        <input
                                            type="text"
                                            value={scSearchTerm}
                                            onChange={(e) => setScSearchTerm(e.target.value)}
                                            placeholder="Buscar por producto, presentación o código..."
                                            className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-emerald-200 bg-white text-xs outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400"
                                        />
                                        {scSearchLoading && (
                                            <IconLoader size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-700 animate-spin" />
                                        )}
                                    </div>

                                    <div className="border border-emerald-200 bg-white rounded-xl overflow-hidden">
                                        <div className="max-h-[360px] overflow-y-auto">
                                            <table className="w-full text-left text-xs">
                                                <thead className="bg-emerald-100/60 text-emerald-900 sticky top-0 z-10">
                                                    <tr>
                                                        <th className="p-3 w-36">Codigo</th>
                                                        <th className="p-3">Producto / Presentación</th>
                                                        <th className="p-3 w-24 text-center">Acción</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-emerald-50">
                                                    {scSearchResults.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={3} className="p-8 text-center text-slate-400 italic">
                                                                {scSearchLoading ? 'Buscando...' : 'No hay resultados. Pruebe escribiendo parte del nombre o código.'}
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        scSearchResults.map((opt: any) => {
                                                            const isSelected =
                                                                String(opt?.value || '') === String(scInput.bienDestinoId || '') &&
                                                                String(opt?.presentacionId || '') === String(scInput.presentacionDestinoId || '');

                                                            const label = String(opt?.label || '').trim();
                                                            return (
                                                                <tr key={String(opt.key || `${opt.value}-${opt.presentacionId}`)} className={isSelected ? 'bg-emerald-50' : 'hover:bg-slate-50'}>
                                                                    <td className="p-3 font-mono text-slate-500">
                                                                        {String(opt?.aux || '').trim() || '-'}
                                                                    </td>
                                                                    <td className="p-3">
                                                                        <div className="font-semibold text-slate-700 uppercase truncate" title={label}>
                                                                            {label || '-'}
                                                                        </div>
                                                                    </td>
                                                                    <td className="p-3 text-center">
                                                                        <button
                                                                            type="button"
                                                                            onClick={() => handleProductDestinoSelect(null as any, opt)}
                                                                            className={`px-3 py-1.5 rounded-lg font-bold border transition-colors ${
                                                                                isSelected
                                                                                    ? 'bg-emerald-600 text-white border-emerald-600'
                                                                                    : 'bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50'
                                                                            }`}
                                                                        >
                                                                            {isSelected ? 'Elegido' : 'Elegir'}
                                                                        </button>
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>

                                <div className="lg:col-span-4 space-y-3">
                                    <div className="bg-white/70 border border-emerald-200 rounded-xl p-4">
                                        <p className="text-[10px] font-bold text-emerald-700 uppercase mb-2">Selección Actual</p>
                                        {scInput.bienDestinoId && scInput.presentacionDestinoId ? (
                                            <>
                                                <p className="text-xs font-black text-slate-800 uppercase truncate" title={scInput.destinoLabel}>
                                                    {scInput.destinoLabel}
                                                </p>
                                                <div className="mt-2 text-[11px] text-slate-600">
                                                    Código: <span className="font-mono font-bold">{scInput.destinoAux || '-'}</span>
                                                </div>
                                            </>
                                        ) : (
                                            <p className="text-xs text-slate-500 italic">Aún no selecciona un destino.</p>
                                        )}
                                    </div>

                                    <div className="bg-white/70 border border-emerald-200 rounded-xl p-4">
                                        <p className="text-[10px] font-bold text-emerald-700 uppercase mb-2">Cantidad</p>
                                        <div className="text-xs text-slate-600">
                                            Se descontará <span className="font-black text-slate-800">{Number(scInput.cantidadInicial || 0)}</span> del origen y se ingresará la misma cantidad al destino.
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="flex justify-end pt-2 border-t border-slate-100 gap-2">
                            <button onClick={() => setShowSCModal(false)} className="px-5 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors">
                                Cancelar
                            </button>
                            <button 
                                onClick={handleSaveSCDestino}
                                disabled={!scInput.bienDestinoId || !scInput.presentacionDestinoId}
                                className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-md shadow-blue-200 flex items-center gap-2"
                            >
                                <IconDeviceFloppy size={18} /> Confirmar Conversión
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* MODAL DISTRIBUCIÓN DE LOTES */}
            <Modal isOpen={showLoteModal} onClose={() => setShowLoteModal(false)} title="Distribución de Lotes de Salida" size="xl">
                <div className="p-4 space-y-5">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex justify-between items-center">
                        <div>
                            <p className="text-[10px] font-bold text-slate-500 uppercase">Producto a despachar</p>
                            <p className="font-bold text-slate-800">{activeItem?.descripcion_aux || ''}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[10px] font-bold text-slate-500 uppercase">Falta Asignar</p>
                            <p className={`text-xl font-black ${pendingQty === 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                                {pendingQty} <span className="text-xs font-semibold text-slate-400">unds</span>
                            </p>
                        </div>
                    </div>

                    {pendingQty > 0 && (
                        <div className="space-y-3 bg-blue-50/50 p-3 rounded-xl border border-blue-100">
                            <div className="flex gap-3 items-end">
                                <div className="flex-1 relative">
                                    <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input
                                        type="text"
                                        placeholder="Buscar lote por código, fecha o descripción..."
                                        className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-lg text-xs outline-none focus:border-blue-500 transition-colors bg-white"
                                        value={loteSearchTerm}
                                        onChange={handleLoteSearchChange}
                                    />
                                </div>
                                <div className="w-28">
                                    <FormInput
                                        label="Cant. a Asignar"
                                        type="number"
                                        min="1"
                                        max={pendingQty}
                                        value={loteInput.cantidad}
                                        onChange={(e:any) => setLoteInput({ cantidad: Number(e.target.value) })}
                                    />
                                </div>
                            </div>

                            {loadingLotes ? (
                                <div className="text-center py-8"><span className="animate-spin text-blue-600 font-bold inline-block"><IconLoader size={28} /></span></div>
                            ) : lotesDisponibles.length === 0 ? (
                                <div className="text-center py-6 text-slate-500 italic">
                                    No se encontraron lotes disponibles.
                                </div>
                            ) : (
                                <div className="max-h-[22rem] overflow-y-auto border rounded-lg bg-white">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-slate-100 sticky top-0 shadow-sm text-slate-600">
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
                                                        <button
                                                            onClick={() => handleAssignLoteDisponible(lote)}
                                                            className="bg-blue-100 text-blue-700 px-3 py-1 rounded font-bold hover:bg-blue-200 w-full"
                                                        >
                                                            Asignar
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}

                    <div className="border rounded-xl overflow-hidden">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-100 text-slate-600">
                                <tr>
                                    <th className="p-3">Lote ID</th>
                                    <th className="p-3 text-right">Stock</th>
                                    <th className="p-3 text-right">Cantidad</th>
                                    <th className="p-3 text-center w-12">Acción</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {activeItemLotes.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="p-6 text-center text-slate-400 italic">
                                            Aún no has asignado lotes.
                                        </td>
                                    </tr>
                                ) : (
                                    activeItemLotes.map((l, i) => (
                                        <tr key={i}>
                                            <td className="p-3 font-mono font-bold text-slate-700">{l.loteLabel || l.loteId}</td>
                                            <td className="p-3 text-right font-mono text-slate-500">{Number(l.stockDisponible || 0).toFixed(2)}</td>
                                            <td className="p-3 text-right font-bold text-blue-600">{l.cantidad}</td>
                                            <td className="p-3 text-center">
                                                <button onClick={() => handleRemoveLoteFromItem(l.loteId)} className="text-rose-500 hover:text-rose-700">
                                                    <IconTrash size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex justify-end pt-2">
                        <button onClick={() => setShowLoteModal(false)} className="px-6 py-2.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors">
                            Listo
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Shell para Importación de Documentos */}
            {isImportModalOpen && (
                <ImportarDocumentoModal
                    isOpen={isImportModalOpen}
                    onClose={() => setIsImportModalOpen(false)}
                    empresaId={EMPRESA_ID}
                    transaccionRules={transaccionRules as any}
                    catalogoTiposDoc={catalogs['TipoDocumentoComercial'] || []}
                    onImport={handleDataImportada}
                    soloStock={true} 
                />
            )}
        </div>
    );
}
