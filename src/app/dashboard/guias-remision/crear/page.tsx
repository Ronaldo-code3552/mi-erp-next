// src/app/dashboard/guias-remision/crear/page.tsx
"use client";
import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { format, isBefore, parseISO, subDays } from 'date-fns';

// Servicios y Tipos
import { guiaRemisionService } from '@/services/guiaRemisionService';
import { productoService } from '@/services/productoService';
import { presentacionService } from '@/services/presentacionService'; 
import { documentoCompraService } from '@/services/documentoCompraService'; // <--- NUEVO SERVICIO IMPORTADO
import documentoVentaService from '@/services/documentoVentaService';
import { GuiaRemisionPayload, GuiaRemisionDetalle } from '@/types/guiaRemision.types';
import type { DocumentoCompra } from '@/types/documentoCompra.types';
import type { DocumentoVenta } from '@/types/documentoVenta.types';

// IMPORTACIONES NUEVAS PARA MODALES DE TRANSPORTE
import UnidadFormModal from '@/app/dashboard/unidad-transporte/components/UnidadFormModal';
import ConductorFormModal from '@/app/dashboard/conductores/components/ConductorFormModal';
import TransportistaFormModal from '@/app/dashboard/transportistas/components/TransportistaFormModal';
import { unidadTransporteService } from '@/services/unidadTransporteService';
import { conductorService } from '@/services/conductorService';
import { transportistaService } from '@/services/transportistaService';

// UI Components
import SearchableSelect from '@/components/forms/SearchableSelect';
import Modal from '@/components/ui/Modal'; 
import { 
    IconDeviceFloppy, IconSend, IconPlus, IconTrash, IconArrowLeft,
    IconMapPin, IconTruck, IconPackage, IconFileDescription, IconFileInvoice,
    IconAlertCircle, IconBarcode, IconEdit, IconSearch, IconLoader
} from '@tabler/icons-react';

// --- COMPONENTE AUXILIAR ---
const SectionTitle = ({ title, icon: Icon }: any) => (
    <div className="flex items-center gap-2 text-slate-800 border-b border-slate-200 pb-2 mb-4 mt-6">
        <Icon className="text-blue-600" size={20} />
        <h3 className="font-bold text-sm uppercase tracking-wide">{title}</h3>
    </div>
);

const FormInput = ({ label, className, disabled, value, ...props }: any) => (
    <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">{label}</label>
        <input 
            disabled={disabled}
            className={`w-full border p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all text-xs 
                ${disabled ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed font-medium' : 'border-slate-200'} 
                ${className || ''}`}
            value={value !== undefined && value !== null ? value : ''} 
            {...props}
        />
    </div>
);

export default function CrearGuiaPage() {
    const router = useRouter();
    
    // CONSTANTES DE CONTEXTO
    const EMPRESA_ID = "005";
    const ALMACEN_ID = "001"; 
    const USER_ID = "CU0001";

    const [loading, setLoading] = useState(false);
    
    // --- ESTADOS DE CATÁLOGOS ---
    const [catalogs, setCatalogs] = useState<any>({});
    const [products, setProducts] = useState<any[]>([]);
    
    // Estados derivados para selects filtrados
    const [docTypeOptions, setDocTypeOptions] = useState<any[]>([]);
    const [filteredSeries, setFilteredSeries] = useState<any[]>([]);
    
    // Control de UI
    const [isManualCorrelativo, setIsManualCorrelativo] = useState(false);
    const [docRefParts, setDocRefComponents] = useState({ serie: '', numero: '' });

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const thirtyDaysAgoStr = format(subDays(new Date(), 30), 'yyyy-MM-dd');

    // --- FORMULARIO PRINCIPAL ---
    const [formData, setFormData] = useState<Partial<GuiaRemisionPayload>>({
        empresaId: EMPRESA_ID,
        cuentausuarioId: USER_ID,
        tipodoccomercialId: '', 
        tipomovimientoId: 'S',      
        serie: '',              
        correlativo: '',            
        fecha_emision: todayStr, 
        fecha_traslado: todayStr,
        fecha_doc: todayStr, 
        doc_referencia_numero: '',
        documentoReferencia: '',
        documentoReferenciaTipo: '', 
        foto_guiaremision: '',
        monedaId: '001', 
        tipo_cambio: 1.0,
        estado: 'REGISTRADO',
        estado_documento_sunat: '0',
        incluye_igv: true,
        
        clienteId: '',
        proveedorId: '', 
        puntoventaId: '', 
        trabajadorId: '', 
        id_almacen_inicio: ALMACEN_ID, 
        id_almacen_destino: '',
        motivotrasladoId: '',
        otro_motivo_traslado: '',
        transportistaId: '',
        conductorId: '',
        unidadTransporteId: '',
        
        punto_partida: '',
        punto_llegada: '',
        observacion: '' 
    });

    // --- ESTADOS PARA MODALES DE TRANSPORTE ---
    const [showUnidadModal, setShowUnidadModal] = useState(false);
    const [unidadToEdit, setUnidadToEdit] = useState<any>(null);

    const [showConductorModal, setShowConductorModal] = useState(false);
    const [conductorToEdit, setConductorToEdit] = useState<any>(null);

    const [showTransportistaModal, setShowTransportistaModal] = useState(false);
    const [transportistaToEdit, setTransportistaToEdit] = useState<any>(null);

    // --- ESTADOS PARA MODAL DE BUSQUEDA DE DOCUMENTOS ---
    const [showDocModal, setShowDocModal] = useState(false);
    const [isSearchingDocs, setIsSearchingDocs] = useState(false);
    const [docSearchFilters, setDocSearchFilters] = useState({
        tipoDocId: '',
        entidadId: '',
        numero: '',
        monedaId: '001',
        fechaIni: thirtyDaysAgoStr,
        fechaFin: todayStr
    });
    const [docSearchResults, setDocSearchResults] = useState<any[]>([]);
    const DOC_SEARCH_PAGE_SIZE = 20;
    const [docSearchPage, setDocSearchPage] = useState(1);
    const [docSearchMeta, setDocSearchMeta] = useState({
        currentPage: 1,
        totalPages: 1,
        totalRecords: 0
    });
    const [docSearchHasSearched, setDocSearchHasSearched] = useState(false);

    const [items, setItems] = useState<GuiaRemisionDetalle[]>([]);

    const reloadCatalogs = async () => {
        try {
            const resCatalogs = await guiaRemisionService.getFormDropdowns(EMPRESA_ID, ALMACEN_ID);
            if (resCatalogs.isSuccess) setCatalogs(resCatalogs.data);
        } catch (error) {
            console.error("Error recargando catálogos", error);
        }
    };

    // ==================================================================================
    // 1. CARGA DE DATOS INICIALES
    // ==================================================================================
    useEffect(() => {
        const loadData = async () => {
            try {
                const resCatalogs = await guiaRemisionService.getFormDropdowns(EMPRESA_ID, ALMACEN_ID);
                
                if (resCatalogs.isSuccess) {
                    const data = resCatalogs.data;
                    setCatalogs(data);

                    const tipoDocJson = data.tipoDocumentoJson || data.tipoDocumentoJSON;
                    const guiaRemitente = tipoDocJson?.find((x: any) => x.key === 'X029');
                    
                    if (guiaRemitente) {
                        setDocTypeOptions([guiaRemitente]);
                        setFormData(prev => ({ ...prev, tipodoccomercialId: guiaRemitente.key }));
                    } else {
                        setDocTypeOptions(tipoDocJson || []);
                    }
                }

                const resProducts = await productoService.getByEmpresa(EMPRESA_ID, 1, 500); 
                if (resProducts.isSuccess) {
                    const mappedProds = resProducts.data
                        .filter((p: any) => p.estado !== 0 && p.estado !== false && p.estado !== '0')
                        .map((p: any) => ({
                            key: p.bienId,
                            value: p.descripcion,
                            aux: p.codigo_existencia,
                            raw: p 
                        }));
                    setProducts(mappedProds);
                }
            } catch (error) {
                toast.error("Error cargando datos iniciales");
            }
        };
        loadData();
    }, []);

    // ==================================================================================
    // 2. LÓGICA DE SERIE Y CORRELATIVO
    // ==================================================================================
    
    useEffect(() => {
        if (formData.tipodoccomercialId && catalogs.serieGuiaJson) {
            const seriesFiltradas = catalogs.serieGuiaJson.filter((s: any) => s.groupkey === formData.tipodoccomercialId);
            setFilteredSeries(seriesFiltradas);

            if (seriesFiltradas.length > 0) {
                setFormData(prev => ({ ...prev, serie: seriesFiltradas[0].key }));
            } else {
                setFormData(prev => ({ ...prev, serie: '' }));
            }
        }
    }, [formData.tipodoccomercialId, catalogs.serieGuiaJson]);

    useEffect(() => {
        if (!isManualCorrelativo && formData.tipodoccomercialId && formData.serie && catalogs.correlativoJson) {
            const searchKey = `${formData.tipodoccomercialId} ${formData.serie}`;
            const correlativoObj = catalogs.correlativoJson.find((c: any) => c.key.trim() === searchKey.trim());

            if (correlativoObj) {
                const lastValStr = correlativoObj.value; 
                const lastValNum = parseInt(lastValStr, 10); 

                if (!isNaN(lastValNum)) {
                    const nextValNum = lastValNum + 1; 
                    const nextValStr = nextValNum.toString().padStart(lastValStr.length, '0'); 
                    setFormData(prev => ({ ...prev, correlativo: nextValStr }));
                } else {
                    setFormData(prev => ({ ...prev, correlativo: lastValStr }));
                }
            } else {
                setFormData(prev => ({ ...prev, correlativo: '0000001' }));
            }
        }
    }, [formData.tipodoccomercialId, formData.serie, catalogs.correlativoJson, isManualCorrelativo]);

    // ==================================================================================
    // 3. REGLAS DE NEGOCIO: MOTIVOS DE TRASLADO
    // ==================================================================================
    
    const getMotivoRules = (motivoId: string) => {
        switch (motivoId) {
            case 'MT00003': 
            case 'MT00008': 
                return { showProv: true, showCli: false, showDestAlmacen: false, start: 'PROV', end: 'ALM_ORIG', refType: 'COMPRA' };
            
            case 'MT00004': 
            case 'MT00001': 
            case 'MT00002': 
            case 'MT00009': 
                return { showProv: false, showCli: true, showDestAlmacen: false, start: 'ALM_ORIG', end: 'CLI', refType: 'VENTA' };
            
            case 'MT00005': 
                return { showProv: false, showCli: true, showDestAlmacen: false, start: 'CLI', end: 'ALM_ORIG', refType: 'VENTA' };
            
            case 'MT00013': 
                return { showProv: true, showCli: false, showDestAlmacen: false, start: 'ALM_ORIG', end: 'PROV', allowManual: true, refType: 'VENTA' };
            
            case 'MT00007': 
                return { showProv: true, showCli: false, showDestAlmacen: false, start: 'ALM_ORIG', end: 'PROV', refType: 'COMPRA' };
            
            case 'MT00006': 
                return { showProv: false, showCli: true, showDestAlmacen: true, start: 'ALM_ORIG', end: 'ALM_DEST', refType: 'VENTA' }; 

            default:
                return { showProv: false, showCli: false, showDestAlmacen: false, start: '', end: '', allowManual: false, refType: '' };
        }
    };

    const currentRules = useMemo(() => getMotivoRules(formData.motivotrasladoId || ''), [formData.motivotrasladoId]);
    const shouldSendToSunat = useMemo(() => {
        const selectedSerie = filteredSeries.find((s: any) => s.key === formData.serie);
        return (selectedSerie?.aux || '').toUpperCase() === 'SI';
    }, [filteredSeries, formData.serie]);

    const VALID_MOTIVOS_SEARCH = ['MT00001', 'MT00002', 'MT00003', 'MT00004', 'MT00013'];
    const canSearchDocument = VALID_MOTIVOS_SEARCH.includes(formData.motivotrasladoId || '');

    useEffect(() => {
        if (!formData.motivotrasladoId) return;

        const getAddress = (sourceType: string) => {
            if (sourceType === 'ALM_ORIG') return catalogs.AlmacenInicioJson?.find((x:any) => x.key === formData.id_almacen_inicio)?.aux || '';
            if (sourceType === 'ALM_DEST') return catalogs.AlmacenDestinoJson?.find((x:any) => x.key === formData.id_almacen_destino)?.aux || '';
            if (sourceType === 'CLI') return catalogs.clienteJson?.find((x:any) => x.key === formData.clienteId)?.aux || '';
            if (sourceType === 'PROV') return catalogs.proveedorJson?.find((x:any) => x.key === formData.proveedorId)?.aux || '';
            return '';
        };

        const newPartida = getAddress(currentRules.start);
        const newLlegada = getAddress(currentRules.end);

        setFormData(prev => {
            if (prev.punto_partida !== newPartida || prev.punto_llegada !== newLlegada) {
                return { ...prev, punto_partida: newPartida, punto_llegada: newLlegada };
            }
            return prev;
        });

    }, [
        formData.motivotrasladoId, 
        formData.clienteId, 
        formData.proveedorId, 
        formData.id_almacen_inicio, 
        formData.id_almacen_destino,
        currentRules,
        catalogs
    ]);

    // ==================================================================================
    // 4. HANDLERS UI
    // ==================================================================================

    const handleChange = (e: any) => {
        const { name, value } = e.target;
        
        if (name === 'fecha_traslado') {
            const fEmision = parseISO(formData.fecha_emision!);
            const fTraslado = parseISO(value);
            if (isBefore(fTraslado, fEmision)) {
                toast.warning("La fecha de traslado no puede ser menor a la fecha de emisión");
            }
        }

        if (name === 'fecha_emision') {
            setFormData(prev => ({ ...prev, [name]: value, fecha_doc: value }));
        } 
        else if (name === 'motivotrasladoId') {
            setFormData(prev => ({ 
                ...prev, 
                [name]: value,
                clienteId: '',
                proveedorId: '',
                id_almacen_destino: '',
                otro_motivo_traslado: ''
            }));
        }
        else if (name === 'documentoReferenciaTipo') {
            const selectedOption = catalogs.documentoReferenciaTipoJSON?.find((t: any) => t.codSunat === value);
            setFormData(prev => ({ 
                ...prev, 
                [name]: value, 
                doc_referencia: selectedOption ? selectedOption.aux : ''
            }));
        } 
        else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleDocRefChange = (field: 'serie' | 'numero', value: string) => {
        const newParts = { ...docRefParts, [field]: value };
        setDocRefComponents(newParts);
        setFormData(prev => ({
            ...prev,
            documentoReferencia: `${newParts.serie} - ${newParts.numero}`
        }));
    };

    // --- MANEJO DE ITEMS ---
    const handleAddItem = () => {
        setItems([...items, { 
            item: items.length + 1, 
            cantidad: 1, 
            bienId: '', 
            unidad_aux: '', 
            descripcion_aux: '', 
            peso_bruto: 0,
            unidades_opciones: [] 
        } as any]);
    };

    const handleRemoveItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const handleItemChange = async (index: number, field: string, value: any) => {
        setItems(prevItems => {
            const newItems = [...prevItems];
            newItems[index] = { ...newItems[index], [field]: value };
            
            if (field === 'bienId') {
                const p = products.find(x => x.key === value);
                if (p) {
                    newItems[index].descripcion_aux = p.value;
                    newItems[index].unidades_opciones = [{ key: '', value: 'Cargando...' }];
                }
            }
            return newItems;
        });

        if (field === 'bienId' && value) {
            const p = products.find(x => x.key === value);
            if (!p) return;

            try {
                const res = await presentacionService.getByBien(value);
                
                let opcionesUM: any[] = [];
                const unidadBaseKey = p.raw?.unidadmedidaId || 'NIU';
                let hasBaseUnitInPresentations = false;

                if (res.isSuccess && res.data && res.data.length > 0) {
                    res.data.forEach((pres: any) => {
                        const presKey = pres.unidadmedidaId?.trim(); 
                        if (presKey === unidadBaseKey?.trim()) {
                            hasBaseUnitInPresentations = true;
                        }
                        opcionesUM.push({
                            key: presKey,
                            value: pres.descripcion || presKey,
                            presentacionId: pres.presentacionId 
                        });
                    });
                }

                if (!hasBaseUnitInPresentations) {
                    const catUnidad = catalogs.unidadMedidaJson?.find((u: any) => u.key === unidadBaseKey);
                    const nombreDesdeProducto = p.raw?.unidadMedidaDesc; 
                    const unidadBaseDesc = catUnidad?.value || nombreDesdeProducto || unidadBaseKey;

                    opcionesUM.unshift({ 
                        key: unidadBaseKey,
                        value: `${unidadBaseDesc} 1`,
                        presentacionId: p.raw?.presentacionId || null
                    });
                }

                setItems(prevItems => {
                    const updated = [...prevItems];
                    if (updated[index] && updated[index].bienId === value) {
                        updated[index].unidades_opciones = opcionesUM;
                        updated[index].unidad_aux = opcionesUM.length > 0 ? opcionesUM[0].key : ''; 
                    }
                    return updated;
                });

            } catch (error) {
                console.error("Error obteniendo presentaciones", error);
                setItems(prevItems => {
                    const updated = [...prevItems];
                    if (updated[index]) {
                        const base = p.raw?.unidadmedidaId || 'NIU';
                        updated[index].unidades_opciones = [{ key: base, value: `${base} 1`, presentacionId: null }];
                        updated[index].unidad_aux = base;
                    }
                    return updated;
                });
            }
        }
    };

    const mapCompraDetallesToGuiaItems = (compra: DocumentoCompra): GuiaRemisionDetalle[] => {
        if (!Array.isArray(compra?.detalles)) return [];

        return compra.detalles.map((detalle: any, idx: number) => {
            const presentacionId = detalle?.presentacionId || '';
            const cantidadNum = Number(detalle?.cantidad ?? 0) || 0;
            const costoNum = Number(detalle?.costo ?? 0) || 0;
            const importeNum = Number(detalle?.importe ?? 0) || 0;
            const saldoCantidadNum = Number(detalle?.saldoCantidad ?? cantidadNum) || 0;
            const saldoTemporalNum = Number(detalle?.saldoTemporal ?? cantidadNum) || 0;

            return {
                item: idx + 1,
                bienId: detalle?.bienId || '',
                presentacionId: presentacionId || null,
                cantidad: cantidadNum,
                conversion_total: Number(detalle?.conversionTotal ?? 0) || 0,
                precio: costoNum,
                costo: costoNum,
                importe: importeNum,
                Saldo_cantidad: saldoCantidadNum,
                descuento_producto: Number(detalle?.descuentoProducto ?? 0) || 0,
                afecto_inafecto: Boolean(detalle?.afectoInafecto),
                observacion: detalle?.observacion ?? '',
                documentoId: compra.documentocompraId,
                tabla_documento: 'DOCUMENTO_COMPRA',
                saldo_temporal: saldoTemporalNum,
                descripcion_aux: detalle?.bien?.descripcion || '',
                unidad_aux: presentacionId,
                unidades_opciones: [
                    {
                        key: presentacionId,
                        value: detalle?.presentacion?.descripcion || presentacionId || '-',
                        presentacionId: presentacionId || null
                    }
                ]
            } as any;
        });
    };

    const mapVentaDetallesToGuiaItems = (venta: DocumentoVenta): GuiaRemisionDetalle[] => {
        if (!Array.isArray(venta?.detalles)) return [];

        return venta.detalles.map((detalle: any, idx: number) => {
            const presentacionId = detalle?.presentacionId || '';
            const cantidadNum = Number(detalle?.cantidad ?? 0) || 0;
            const precioNum = Number(detalle?.precio ?? 0) || 0;
            const importeNum = Number(detalle?.importe ?? 0) || 0;
            const saldoCantidadNum = Number(detalle?.saldoCantidad ?? cantidadNum) || 0;
            const saldoTemporalNum = Number(detalle?.saldoTemporal ?? cantidadNum) || 0;

            return {
                item: idx + 1,
                bienId: detalle?.bienId || '',
                presentacionId: presentacionId || null,
                cantidad: cantidadNum,
                conversion_total: Number(detalle?.conversionTotal ?? 0) || 0,
                precio: precioNum,
                costo: precioNum,
                importe: importeNum,
                Saldo_cantidad: saldoCantidadNum,
                descuento_producto: Number(detalle?.descuentoProducto ?? 0) || 0,
                afecto_inafecto: Boolean(detalle?.afectoInafecto),
                observacion: detalle?.observacion ?? '',
                documentoId: venta.documentoventaId,
                tabla_documento: 'DOCUMENTO_VENTA',
                saldo_temporal: saldoTemporalNum,
                descripcion_aux: detalle?.bien?.descripcion || '',
                unidad_aux: presentacionId,
                unidades_opciones: [
                    {
                        key: presentacionId,
                        value: detalle?.presentacion?.descripcion || presentacionId || '-',
                        presentacionId: presentacionId || null
                    }
                ]
            } as any;
        });
    };

    const handleSelectCompraDocument = async (documentocompraId: string) => {
        if (!documentocompraId) return toast.error('Documento de compra inválido');

        setIsSearchingDocs(true);
        try {
            const res = await documentoCompraService.getById(documentocompraId);

            if (!res?.isSuccess || !res?.data) {
                toast.error(res?.message || 'No se pudo obtener el documento de compra');
                return;
            }

            const compra = res.data;
            const serieRef = (compra.serie || '').trim();
            const numeroRef = (compra.numero || '').trim();
            const referencia = [serieRef, numeroRef].filter(Boolean).join(' - ');

            const refTypeOption = catalogs.documentoReferenciaTipoJSON?.find(
                (t: any) =>
                    t.key === compra.tipodoccomercialId ||
                    (compra.tipoDocumentoComercial?.descripcion || '').toUpperCase() === (t.value || '').toUpperCase()
            );

            setDocRefComponents({ serie: serieRef, numero: numeroRef });
            setFormData((prev) => ({
                ...prev,
                proveedorId: compra.proveedorId || prev.proveedorId,
                monedaId: compra.monedaId || prev.monedaId,
                documentoReferencia: referencia || prev.documentoReferencia,
                documentoReferenciaTipo: refTypeOption?.codSunat || prev.documentoReferenciaTipo,
                doc_referencia: refTypeOption?.aux || prev.doc_referencia,
                doc_referencia_numero: compra.documentocompraId || prev.doc_referencia_numero
            }));

            const mappedItems = mapCompraDetallesToGuiaItems(compra);
            if (mappedItems.length > 0) {
                setItems(mappedItems);
            }

            setShowDocModal(false);
            toast.success('Documento de compra importado correctamente');
        } catch (error: any) {
            console.error('Error getById DocumentoCompra:', error?.response?.data || error?.message || error);
            toast.error(error?.response?.data?.message || 'Error al importar documento de compra');
        } finally {
            setIsSearchingDocs(false);
        }
    };

    const handleSelectVentaDocument = async (documentoventaId: string) => {
        if (!documentoventaId) return toast.error('Documento de venta inválido');

        setIsSearchingDocs(true);
        try {
            const venta = await documentoVentaService.getById(documentoventaId);

            if (!venta?.documentoventaId) {
                toast.error('No se pudo obtener el documento de venta');
                return;
            }

            const serieRef = (venta.serie || '').trim();
            const numeroRef = (venta.numero || '').trim();
            const referencia = [serieRef, numeroRef].filter(Boolean).join(' - ');

            const refTypeOption = catalogs.documentoReferenciaTipoJSON?.find(
                (t: any) =>
                    t.key === venta.tipodoccomercialId ||
                    (venta.tipoDocumentoComercial?.descripcion || '').toUpperCase() === (t.value || '').toUpperCase()
            );

            setDocRefComponents({ serie: serieRef, numero: numeroRef });
            setFormData((prev) => ({
                ...prev,
                clienteId: venta.clienteId || prev.clienteId,
                monedaId: venta.monedaId || prev.monedaId,
                tipo_cambio: Number(venta.tipo_cambio ?? prev.tipo_cambio ?? 1),
                documentoReferencia: referencia || prev.documentoReferencia,
                documentoReferenciaTipo: refTypeOption?.codSunat || prev.documentoReferenciaTipo,
                doc_referencia: refTypeOption?.aux || prev.doc_referencia,
                doc_referencia_numero: venta.documentoventaId || prev.doc_referencia_numero
            }));

            const mappedItems = mapVentaDetallesToGuiaItems(venta);
            if (mappedItems.length > 0) {
                setItems(mappedItems);
            }

            setShowDocModal(false);
            toast.success('Documento de venta importado correctamente');
        } catch (error: any) {
            console.error('Error getById DocumentoVenta:', error?.response?.data || error?.message || error);
            toast.error(error?.response?.data?.message || 'Error al importar documento de venta');
        } finally {
            setIsSearchingDocs(false);
        }
    };

    const handleSubmit = async (enviarSunat: boolean) => {
        if (!formData.serie || !formData.correlativo) return toast.error("Falta Serie o Correlativo");
        if (!formData.motivotrasladoId) return toast.error("Seleccione un Motivo de Traslado");
        if (items.length === 0) return toast.error("Debe agregar al menos un ítem");
        
        if (currentRules.showCli && !formData.clienteId) return toast.error("Seleccione un Cliente");
        if (currentRules.showProv && !formData.proveedorId) return toast.error("Seleccione un Proveedor");

        setLoading(true);
        try {
            const payload: GuiaRemisionPayload = {
                ...formData as GuiaRemisionPayload,
                puntoventaId: '',
                trabajadorId: '',
                detalles: items.map((item, idx) => {
                    const cantidadNum = Number(item.cantidad) || 0;
                    const selectedUM = item.unidades_opciones?.find((u: any) => u.key === item.unidad_aux);
                    const idPresentacion = selectedUM?.presentacionId || null;

                    return {
                        ...item, 
                        bienId: item.bienId,
                        presentacionId: idPresentacion,
                        item: idx + 1,
                        cantidad: cantidadNum,
                        conversion_total: 100, 
                        precio: 100,  
                        costo: 100, 
                        importe: 100, 
                        Saldo_cantidad: cantidadNum, 
                        descuento_producto: null,  
                        afecto_inafecto: 0, 
                        observacion: 'KG', 
                        documentoId: null, 
                        tabla_documento: 'GUIAS_REMISION', 
                        saldo_temporal: cantidadNum
                    };
                })
            };

            let response;
            if (enviarSunat) {
                response = await guiaRemisionService.createAndValidate(payload);
            } else {
                response = await guiaRemisionService.create(payload);
            }

            if (response.isSuccess) {
                toast.success(enviarSunat ? "Guía enviada a SUNAT" : "Guía guardada exitosamente");
                router.push('/dashboard/guias-remision');
            } else {
                toast.error(response.message || "Error al procesar la guía");
            }

        } catch (error: any) {
            toast.error("Error crítico: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    // --- MODALES DE TRANSPORTE ---
    const handleOpenUnidad = async (action: 'ADD' | 'EDIT') => {
        if (action === 'ADD') {
            setUnidadToEdit(null);
            setShowUnidadModal(true);
        } else {
            if (!formData.unidadTransporteId) return toast.warning("Seleccione un vehículo");
            setLoading(true);
            try {
                const res = await unidadTransporteService.getById(formData.unidadTransporteId);
                if (res.isSuccess) {
                    setUnidadToEdit(res.data);
                    setShowUnidadModal(true);
                } else toast.error("No se pudo cargar el vehículo");
            } catch (e) { toast.error("Error al cargar vehículo"); }
            finally { setLoading(false); }
        }
    };

    const handleOpenConductor = async (action: 'ADD' | 'EDIT') => {
        if (action === 'ADD') {
            setConductorToEdit(null);
            setShowConductorModal(true);
        } else {
            if (!formData.conductorId) return toast.warning("Seleccione un conductor");
            setLoading(true);
            try {
                const res = await conductorService.getById(formData.conductorId);
                if (res.isSuccess) {
                    setConductorToEdit(res.data);
                    setShowConductorModal(true);
                } else toast.error("No se pudo cargar el conductor");
            } catch (e) { toast.error("Error al cargar conductor"); }
            finally { setLoading(false); }
        }
    };

    const handleOpenTransportista = async (action: 'ADD' | 'EDIT') => {
        if (action === 'ADD') {
            setTransportistaToEdit(null);
            setShowTransportistaModal(true);
        } else {
            if (!formData.transportistaId) return toast.warning("Seleccione una empresa de transporte");
            setLoading(true);
            try {
                const res = await transportistaService.getById(formData.transportistaId);
                if (res.isSuccess) {
                    setTransportistaToEdit(res.data);
                    setShowTransportistaModal(true);
                } else toast.error("No se pudo cargar el transportista");
            } catch (e) { toast.error("Error al cargar transportista"); }
            finally { setLoading(false); }
        }
    };

    // --- LÓGICA: BÚSQUEDA DE DOCUMENTOS DE REFERENCIA ---
    const handleOpenDocSearch = () => {
        setDocSearchFilters(prev => ({
            ...prev,
            entidadId: currentRules.showProv ? (formData.proveedorId || '') : (formData.clienteId || '')
        }));
        setDocSearchResults([]);
        setDocSearchPage(1);
        setDocSearchMeta({ currentPage: 1, totalPages: 1, totalRecords: 0 });
        setDocSearchHasSearched(false);
        setShowDocModal(true);
    };

    const fetchDocumentsPage = async (pageToLoad: number) => {
        // 1. Validar el tipo de búsqueda según el motivo seleccionado
        if (!['COMPRA', 'VENTA'].includes(currentRules.refType || '')) return;

        setIsSearchingDocs(true);
        try {
            if (currentRules.refType === 'COMPRA') {
                const filtersObj: any = {};

                if (docSearchFilters.tipoDocId) filtersObj.tipo_documento = [docSearchFilters.tipoDocId];
                if (docSearchFilters.entidadId) filtersObj.proveedor = [docSearchFilters.entidadId];
                if (docSearchFilters.monedaId) filtersObj.moneda = [docSearchFilters.monedaId];
                if (docSearchFilters.fechaIni) filtersObj.fecha_inicio = docSearchFilters.fechaIni;
                if (docSearchFilters.fechaFin) filtersObj.fecha_fin = docSearchFilters.fechaFin;

                const res = await documentoCompraService.getByEmpresa(
                    EMPRESA_ID,
                    pageToLoad,
                    DOC_SEARCH_PAGE_SIZE,
                    docSearchFilters.numero || "",
                    filtersObj
                );

                if (res.isSuccess && res.data) {
                    const rows = Array.isArray(res.data) ? res.data : [];
                    const rowsForPage = res.meta
                        ? rows
                        : rows.slice((pageToLoad - 1) * DOC_SEARCH_PAGE_SIZE, pageToLoad * DOC_SEARCH_PAGE_SIZE);

                    const mappedResults = rowsForPage.map((doc: any) => ({
                        id: doc.documentocompraId,
                        fecha: doc.fechaEmision
                            ? format(parseISO(doc.fechaEmision), 'dd/MM/yyyy')
                            : doc.fecha_emision
                                ? format(parseISO(doc.fecha_emision), 'dd/MM/yyyy')
                                : '',
                        nroDoc: `${doc.serie || ''} - ${doc.numero || ''}`.trim(),
                        entidad: doc.proveedor?.descripcion || 'Sin Proveedor',
                        moneda: doc.monedaId,
                        raw: doc
                    }));

                    const totalRecords = res.meta?.totalRecords ?? rows.length;
                    const totalPages = res.meta?.totalPages ?? Math.max(1, Math.ceil(totalRecords / DOC_SEARCH_PAGE_SIZE));

                    setDocSearchResults(mappedResults);
                    setDocSearchPage(pageToLoad);
                    setDocSearchMeta({
                        currentPage: res.meta?.currentPage ?? pageToLoad,
                        totalPages,
                        totalRecords
                    });

                    if (pageToLoad === 1 && mappedResults.length === 0) {
                        toast.info("No se encontraron compras con estos filtros.");
                    }
                } else {
                    toast.error(res.message || "Error al buscar documentos");
                    setDocSearchResults([]);
                    setDocSearchMeta({ currentPage: 1, totalPages: 1, totalRecords: 0 });
                }
                return;
            }

            const filtersObj: any = {};

            if (docSearchFilters.tipoDocId) filtersObj.tipodoccomercialIds = [docSearchFilters.tipoDocId];
            if (docSearchFilters.monedaId) filtersObj.monedaIds = [docSearchFilters.monedaId];
            if (docSearchFilters.fechaIni) filtersObj.fechaDesde = docSearchFilters.fechaIni;
            if (docSearchFilters.fechaFin) filtersObj.fechaHasta = docSearchFilters.fechaFin;

            const res = await documentoVentaService.getByEmpresa(
                EMPRESA_ID,
                pageToLoad,
                DOC_SEARCH_PAGE_SIZE,
                docSearchFilters.numero || "",
                filtersObj
            );

            const ventaRows = Array.isArray(res?.data) ? res.data : [];

            const mappedResults = ventaRows
                .filter((doc: any) => {
                    if (!docSearchFilters.entidadId) return true;
                    const matchesCliente = doc.clienteId === docSearchFilters.entidadId;
                    const matchesProveedor = doc.proveedorId === docSearchFilters.entidadId;
                    return currentRules.showProv ? matchesProveedor : matchesCliente;
                })
                .map((doc: any) => ({
                    id: doc.documentoventaId,
                    fecha: doc.fechaEmision
                        ? format(parseISO(doc.fechaEmision), 'dd/MM/yyyy')
                        : doc.fecha_emision
                            ? format(parseISO(doc.fecha_emision), 'dd/MM/yyyy')
                            : '',
                    nroDoc: `${doc.serie || ''} - ${doc.numero || ''}`.trim(),
                    entidad: doc.cliente?.descripcion || doc.proveedor?.descripcion || 'Sin Entidad',
                    moneda: doc.monedaId,
                    raw: doc
                }));

            setDocSearchResults(mappedResults);
            setDocSearchPage(pageToLoad);
            setDocSearchMeta({
                currentPage: res?.meta?.currentPage ?? pageToLoad,
                totalPages: res?.meta?.totalPages ?? 1,
                totalRecords: res?.meta?.totalRecords ?? mappedResults.length
            });

            if (pageToLoad === 1 && mappedResults.length === 0) {
                toast.info("No se encontraron ventas con estos filtros.");
            }
        } catch (error: any) {
            console.error("Error búsqueda documento:", error?.response?.data || error?.message || error);
            toast.error("Error de conexión al buscar documentos");
            setDocSearchResults([]);
            setDocSearchMeta({ currentPage: 1, totalPages: 1, totalRecords: 0 });
        } finally {
            setIsSearchingDocs(false);
        }
    };

    const handleSearchDocSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setDocSearchHasSearched(true);
        await fetchDocumentsPage(1);
    };

    const filteredDocSearchTypes = useMemo(() => {
        const tiposDisponibles = catalogs.tipoDocumentoJson || catalogs.tipoDocumentoJSON;
        if (!tiposDisponibles) return [];

        const motivo = formData.motivotrasladoId;
        let filtroAux = "";

        if (motivo === 'MT00003') {
            filtroAux = "DOCUMENTO_COMPRA";
        } 
        else if (['MT00001', 'MT00002', 'MT00004', 'MT00013'].includes(motivo || '')) {
            filtroAux = "DOCUMENTO_VENTA";
        }

        if (!filtroAux) return [];

        return tiposDisponibles.filter((t: any) => 
            t.aux && t.aux.toUpperCase() === filtroAux
        );
    }, [formData.motivotrasladoId, catalogs]);

    const entitySearchOptions = currentRules.showProv ? catalogs.proveedorJson : catalogs.clienteJson;
    const entitySearchLabel = currentRules.showProv ? "Proveedor" : "Cliente";


    // ==================================================================================
    // RENDERIZADO
    // ==================================================================================

    return (
        <div className="p-6 max-w-7xl mx-auto pb-20 animate-fade-in-up">
            
            {/* HEADER */}
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
                        <IconArrowLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Nueva Guía de Remisión</h1>
                        <p className="text-xs text-slate-500">Gestión de Traslados y Salidas</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={() => handleSubmit(shouldSendToSunat)} 
                        disabled={loading}
                        className="px-6 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                    >
                        {shouldSendToSunat ? <IconSend size={20} /> : <IconDeviceFloppy size={20} />}
                        {shouldSendToSunat ? 'Enviar SUNAT' : 'Guardar'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-12 gap-6">
                
                <div className="col-span-12 lg:col-span-8 space-y-6">
                    
                    {/* 1. INFORMACIÓN GENERAL */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                            <IconBarcode size={120} />
                        </div>

                        <SectionTitle title="Información General" icon={IconFileDescription} />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Tipo Documento</label>
                                <select 
                                    name="tipodoccomercialId" 
                                    value={formData.tipodoccomercialId} 
                                    onChange={handleChange}
                                    className="w-full border border-slate-200 p-2.5 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 bg-white font-bold text-slate-700"
                                >
                                    {docTypeOptions.length === 0 && <option value="">Cargando...</option>}
                                    {docTypeOptions.map((t: any) => (
                                        <option key={t.key} value={t.key}>{t.value}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Serie</label>
                                    <select 
                                        name="serie" 
                                        value={formData.serie} 
                                        onChange={handleChange}
                                        disabled={filteredSeries.length === 0}
                                        className="w-full border border-slate-200 p-2.5 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-slate-50"
                                    >
                                        {filteredSeries.length === 0 && <option value="">-</option>}
                                        {filteredSeries.map((s: any) => (
                                            <option key={s.key} value={s.key}>{s.value}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="flex flex-col gap-1.5 relative">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase ml-1 flex justify-between">
                                        Correlativo
                                        <div className="flex items-center gap-1 cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                checked={isManualCorrelativo} 
                                                onChange={(e) => {
                                                    setIsManualCorrelativo(e.target.checked);
                                                    if (!e.target.checked) setFormData(p => ({ ...p, correlativo: '' }));
                                                }}
                                                className="w-3 h-3 accent-blue-600 cursor-pointer"
                                            />
                                            <span className="text-[9px] text-blue-600 font-bold select-none">MANUAL</span>
                                        </div>
                                    </label>
                                    <input 
                                        name="correlativo"
                                        value={formData.correlativo || ''}
                                        onChange={handleChange}
                                        disabled={!isManualCorrelativo}
                                        placeholder={isManualCorrelativo ? "Escriba..." : "Automático"}
                                        className={`w-full border p-2.5 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 transition-all font-mono tracking-wider ${isManualCorrelativo ? 'bg-white border-blue-300' : 'bg-slate-50 border-slate-200 text-slate-500'}`}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <FormInput 
                                    label="Fecha Documento" 
                                    type="date" 
                                    name="fecha_doc" 
                                    value={formData.fecha_doc} 
                                    onChange={handleChange} 
                                />
                                <FormInput 
                                    label="Fecha Traslado" 
                                    type="date" 
                                    name="fecha_traslado" 
                                    value={formData.fecha_traslado} 
                                    onChange={handleChange} 
                                    min={formData.fecha_emision} 
                                />
                            </div>

                        </div>
                    </div>

                    {/* 2. DATOS DEL TRASLADO */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <SectionTitle title="Datos del Traslado" icon={IconMapPin} />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            
                            <div className="md:col-span-2">
                                <SearchableSelect 
                                    label="Motivo de Traslado" name="motivotrasladoId"
                                    options={catalogs.motivoTasladoJson?.map((x:any) => ({ key: x.key, value: x.value, aux: x.aux }))}
                                    value={formData.motivotrasladoId} onChange={handleChange}
                                    placeholder="Seleccione el motivo para configurar origen/destino"
                                />
                            </div>

                            {currentRules.allowManual && (
                                <div className="md:col-span-2 animate-in fade-in slide-in-from-top-2">
                                    <FormInput label="Especifique el Motivo" name="otro_motivo_traslado" value={formData.otro_motivo_traslado} onChange={handleChange} />
                                </div>
                            )}

                            {currentRules.showCli && (
                                <div className="md:col-span-2 animate-in fade-in slide-in-from-top-2">
                                    <SearchableSelect 
                                        label="Cliente (Destinatario)" name="clienteId"
                                        options={catalogs.clienteJson?.map((c:any) => ({ key: c.key, value: c.value, aux: c.aux }))}
                                        value={formData.clienteId} onChange={handleChange}
                                    />
                                </div>
                            )}

                            {currentRules.showProv && (
                                <div className="md:col-span-2 animate-in fade-in slide-in-from-top-2">
                                    <SearchableSelect 
                                        label="Proveedor (Remitente/Origen)" name="proveedorId"
                                        options={catalogs.proveedorJson?.map((p:any) => ({ key: p.key, value: p.value, aux: p.aux }))}
                                        value={formData.proveedorId} onChange={handleChange}
                                    />
                                </div>
                            )}

                            <div className="space-y-3">
                                <SearchableSelect 
                                    label="Almacén Origen (Local)" name="id_almacen_inicio"
                                    options={catalogs.AlmacenInicioJson?.map((x:any) => ({ key: x.key, value: x.value, aux: x.aux }))}
                                    value={formData.id_almacen_inicio} onChange={handleChange}
                                    disabled={true} 
                                />
                                <FormInput 
                                    label="Dirección de Partida" name="punto_partida" 
                                    value={formData.punto_partida} onChange={handleChange} 
                                    disabled={true} 
                                />
                            </div>

                            <div className="space-y-3">
                                {currentRules.showDestAlmacen ? (
                                    <SearchableSelect 
                                        label="Almacén Destino" name="id_almacen_destino"
                                        options={catalogs.AlmacenDestinoJson?.filter((x:any) => x.key !== formData.id_almacen_inicio).map((x:any) => ({ key: x.key, value: x.value, aux: x.aux }))}
                                        value={formData.id_almacen_destino} onChange={handleChange}
                                        disabled={false} 
                                    />
                                ) : (
                                    <div className="h-[62px] flex items-end pb-2">
                                        <span className="text-xs text-slate-400 italic">Destino según entidad seleccionada</span>
                                    </div>
                                )}
                                
                                <FormInput 
                                    label="Dirección de Llegada" name="punto_llegada" 
                                    value={formData.punto_llegada} onChange={handleChange} 
                                    disabled={true}
                                />
                            </div>
                        </div>
                    </div>

                    {/* 3. REFERENCIAS */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <SectionTitle title="Documento Referencia" icon={IconFileInvoice} />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            
                            <div className="space-y-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[10px] font-bold text-slate-500 uppercase">Tipo Documento</label>
                                    <select 
                                        name="documentoReferenciaTipo" 
                                        value={formData.documentoReferenciaTipo || ''} 
                                        onChange={handleChange} 
                                        className="w-full border border-slate-200 p-2.5 rounded-lg text-xs outline-none bg-white"
                                    >
                                        <option value="">-- SEL --</option>
                                        {catalogs.documentoReferenciaTipoJSON?.map((t: any) => (
                                            <option key={t.key} value={t.codSunat}>{t.value}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <FormInput label="Serie Ref." placeholder="F001" value={docRefParts.serie} onChange={(e:any) => handleDocRefChange('serie', e.target.value)} />
                                    <FormInput label="Número Ref." placeholder="000458" value={docRefParts.numero} onChange={(e:any) => handleDocRefChange('numero', e.target.value)} />
                                </div>
                                <div className="text-[10px] text-slate-400 text-right italic truncate">Ref: {formData.documentoReferencia}</div>
                            </div>
                            
                            <div className="space-y-3 p-3">
                                {/* BOTÓN DE BÚSQUEDA DE DOCUMENTOS */}
                                {canSearchDocument && (
                                    <button 
                                        type="button" 
                                        onClick={handleOpenDocSearch} 
                                        className="text-xs bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 hover:bg-indigo-100 transition-colors border border-indigo-100"
                                    >
                                        <IconSearch size={14} /> Importar Doc.
                                    </button>
                                )}
                                <FormInput label="Otro Doc (Opcional)" name="doc_referencia_numero" value={formData.doc_referencia_numero} onChange={handleChange} placeholder="Ej: Pedido 123" />
                            </div>
                        </div>
                    </div>

                    {/* 4. ITEMS */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <div className="flex justify-between items-center border-b border-slate-200 pb-2 mb-4 mt-2">
                            <div className="flex items-center gap-2 text-slate-800">
                                <IconPackage className="text-blue-600" size={20} />
                                <h3 className="font-bold text-sm uppercase tracking-wide">Bienes a Transportar</h3>
                            </div>
                            <div className="flex gap-2">
                                <button type="button" onClick={handleAddItem} className="text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 hover:bg-blue-100 transition-colors">
                                    <IconPlus size={14} /> Agregar
                                </button>
                            </div>
                        </div>
                        
                        <div className="overflow-visible min-h-[300px]">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50 text-slate-500 uppercase font-semibold">
                                    <tr>
                                        <th className="p-3 w-10">#</th>
                                        <th className="p-3 w-[50%]">Descripción del Producto</th>
                                        <th className="p-3 w-32">U.M.</th>
                                        <th className="p-3 w-28 text-right">Cant.</th>
                                        <th className="p-3 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {items.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="p-8 text-center text-slate-400 italic bg-slate-50/50 rounded-lg">
                                                No hay items. Agregue productos al detalle.
                                            </td>
                                        </tr>
                                    ) : (
                                        items.map((item: any, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                                <td className="p-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                                                <td className="p-3">
                                                    <SearchableSelect 
                                                        options={products} 
                                                        value={item.bienId} 
                                                        onChange={(e:any) => handleItemChange(idx, 'bienId', e.target.value)}
                                                        placeholder="Buscar producto por nombre o código..."
                                                    />
                                                </td>
                                                <td className="p-3">
                                                    <select 
                                                        className="w-full border border-slate-200 p-2 rounded outline-none focus:ring-1 focus:ring-blue-500 bg-white text-xs text-slate-700"
                                                        value={item.unidad_aux} 
                                                        onChange={(e) => handleItemChange(idx, 'unidad_aux', e.target.value)}
                                                        disabled={!item.unidades_opciones || item.unidades_opciones.length === 0}
                                                    >
                                                        {item.unidades_opciones?.map((u: any) => (
                                                            <option key={u.key} value={u.key}>{u.value}</option>
                                                        ))}
                                                        {(!item.unidades_opciones || item.unidades_opciones.length === 0) && (
                                                            <option value="">-</option>
                                                        )}
                                                    </select>
                                                </td>
                                                <td className="p-3">
                                                    <input 
                                                        type="number" 
                                                        className="w-full border border-slate-200 rounded p-1.5 text-right outline-none focus:ring-1 focus:ring-blue-500" 
                                                        value={item.cantidad} 
                                                        onChange={(e) => handleItemChange(idx, 'cantidad', e.target.value)} 
                                                    />
                                                </td>
                                                <td className="p-3 text-center">
                                                    <button type="button" onClick={() => handleRemoveItem(idx)} className="text-slate-400 hover:text-red-500 transition-colors">
                                                        <IconTrash size={16}/>
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* COLUMNA DERECHA (Transporte) */}
                <div className="col-span-12 lg:col-span-4 space-y-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 sticky top-4">
                        <SectionTitle title="Transporte" icon={IconTruck} />
                        <div className="space-y-4">
                            
                            <div className="flex gap-2 items-start">
                                <div className="flex-1">
                                    <SearchableSelect 
                                        label="Empresa Transporte" name="transportistaId" 
                                        options={catalogs.transportistaJson?.map((x:any) => ({ key: x.key, value: x.value }))} 
                                        value={formData.transportistaId} onChange={handleChange} 
                                    />
                                </div>
                                <div className="flex gap-1 items-end pb-0.5 mt-5">
                                    <button type="button" onClick={() => handleOpenTransportista('ADD')} className="p-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors" title="Agregar Transportista">
                                        <IconPlus size={16} />
                                    </button>
                                    <button type="button" onClick={() => handleOpenTransportista('EDIT')} disabled={!formData.transportistaId} className="p-1.5 bg-orange-50 text-orange-600 rounded hover:bg-orange-100 disabled:opacity-30 transition-colors" title="Editar Transportista">
                                        <IconEdit size={16} />
                                    </button>
                                </div>
                            </div>
                            
                            <div className="flex gap-2 items-start">
                                <div className="flex-1">
                                    <SearchableSelect 
                                        label="Vehículo / Placa" name="unidadTransporteId" 
                                        options={catalogs.unidadTransporteJson?.map((x:any) => ({ key: x.key, value: x.value }))} 
                                        value={formData.unidadTransporteId} onChange={handleChange} 
                                    />
                                </div>
                                <div className="flex gap-1 items-end pb-0.5 mt-5">
                                    <button type="button" onClick={() => handleOpenUnidad('ADD')} className="p-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors" title="Agregar Vehículo">
                                        <IconPlus size={16} />
                                    </button>
                                    <button type="button" onClick={() => handleOpenUnidad('EDIT')} disabled={!formData.unidadTransporteId} className="p-1.5 bg-orange-50 text-orange-600 rounded hover:bg-orange-100 disabled:opacity-30 transition-colors" title="Editar Vehículo">
                                        <IconEdit size={16} />
                                    </button>
                                </div>
                            </div>

                            <div className="flex gap-2 items-start">
                                <div className="flex-1">
                                    <SearchableSelect 
                                        label="Conductor" name="conductorId" 
                                        options={catalogs.conductorJson?.map((x:any) => ({ key: x.key, value: x.value }))} 
                                        value={formData.conductorId} onChange={handleChange} 
                                    />
                                </div>
                                <div className="flex gap-1 items-end pb-0.5 mt-5">
                                    <button type="button" onClick={() => handleOpenConductor('ADD')} className="p-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors" title="Agregar Conductor">
                                        <IconPlus size={16} />
                                    </button>
                                    <button type="button" onClick={() => handleOpenConductor('EDIT')} disabled={!formData.conductorId} className="p-1.5 bg-orange-50 text-orange-600 rounded hover:bg-orange-100 disabled:opacity-30 transition-colors" title="Editar Conductor">
                                        <IconEdit size={16} />
                                    </button>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-slate-100">
                                <FormInput label="Observaciones Generales" name="observacion" value={formData.observacion} onChange={handleChange} />
                            </div>
                        </div>
                        
                        <div className="mt-4 bg-blue-50 p-4 rounded-lg border border-blue-100 text-[10px] text-blue-800 leading-relaxed">
                            <p className="font-bold mb-1">Nota Importante:</p>
                            <p>Verifique los datos del conductor y la placa. La SUNAT rechazará la guía si el RUC del transportista o la licencia del conductor no son válidos.</p>
                        </div>
                    </div>
                </div>

            </div>

            {/* --- MODAL DE BÚSQUEDA DE DOCUMENTOS DE REFERENCIA --- */}
            <Modal isOpen={showDocModal} onClose={() => setShowDocModal(false)} title="Buscar Documento de Referencia" size="xl">
                <form onSubmit={handleSearchDocSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
                        
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Tipo Documento</label>
                            <select 
                                className="w-full border border-slate-200 p-2.5 rounded-lg text-xs outline-none bg-white focus:ring-2 focus:ring-indigo-500"
                                value={docSearchFilters.tipoDocId}
                                onChange={(e) => setDocSearchFilters({...docSearchFilters, tipoDocId: e.target.value})}
                            >
                                <option value="">-- TODOS --</option>
                                {filteredDocSearchTypes.map((t: any) => (
                                    <option key={t.key} value={t.key}>{t.value}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">{entitySearchLabel}</label>
                            <SearchableSelect 
                                options={entitySearchOptions?.map((x:any) => ({key: x.key, value: x.value}))}
                                value={docSearchFilters.entidadId}
                                onChange={(e:any) => setDocSearchFilters({...docSearchFilters, entidadId: e.target.value})}
                                placeholder="Seleccione..."
                            />
                        </div>

                        <FormInput 
                            label="N° Documento" 
                            placeholder="Ej: F001-123" 
                            value={docSearchFilters.numero} 
                            onChange={(e:any) => setDocSearchFilters({...docSearchFilters, numero: e.target.value})} 
                        />

                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Moneda</label>
                            <select 
                                className="w-full border border-slate-200 p-2.5 rounded-lg text-xs outline-none bg-white focus:ring-2 focus:ring-indigo-500"
                                value={docSearchFilters.monedaId}
                                onChange={(e) => setDocSearchFilters({...docSearchFilters, monedaId: e.target.value})}
                            >
                                <option value="">-- TODAS --</option>
                                {catalogs.monedaJson?.map((m: any) => (
                                    <option key={m.key} value={m.key}>{m.value}</option>
                                ))}
                            </select>
                        </div>

                        <FormInput 
                            label="Fecha Inicial" 
                            type="date" 
                            value={docSearchFilters.fechaIni} 
                            onChange={(e:any) => setDocSearchFilters({...docSearchFilters, fechaIni: e.target.value})} 
                        />
                        <FormInput 
                            label="Fecha Final" 
                            type="date" 
                            value={docSearchFilters.fechaFin} 
                            onChange={(e:any) => setDocSearchFilters({...docSearchFilters, fechaFin: e.target.value})} 
                        />
                    </div>

                    <div className="flex justify-end">
                        <button type="submit" disabled={isSearchingDocs} className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold text-xs flex items-center gap-2 hover:bg-indigo-700 disabled:opacity-50">
                            {isSearchingDocs ? <IconLoader size={16} className="animate-spin" /> : <IconSearch size={16} />} 
                            BUSCAR
                        </button>
                    </div>
                </form>

                {/* TABLA DE RESULTADOS */}
                <div className="mt-6 border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 text-slate-600 font-bold uppercase">
                            <tr>
                                <th className="p-3">ID</th>
                                <th className="p-3">Fecha</th>
                                <th className="p-3">N° Doc</th>
                                <th className="p-3">{entitySearchLabel}</th>
                                <th className="p-3 text-center">Moneda</th>
                                <th className="p-3 text-center">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {docSearchResults.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-slate-400 italic">
                                        {docSearchHasSearched
                                            ? "No hay documentos encontrados para esta página/filtro."
                                            : 'No hay documentos encontrados. Aplique los filtros y presione "Buscar".'}
                                    </td>
                                </tr>
                            ) : (
                                docSearchResults.map((doc, idx) => (
                                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                        <td className="p-3 font-mono">{doc.id}</td>
                                        <td className="p-3">{doc.fecha}</td>
                                        <td className="p-3 font-bold">{doc.nroDoc}</td>
                                        <td className="p-3">{doc.entidad}</td>
                                        <td className="p-3 text-center">{doc.moneda}</td>
                                        <td className="p-3 text-center">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    currentRules.refType === 'COMPRA'
                                                        ? handleSelectCompraDocument(doc.id)
                                                        : handleSelectVentaDocument(doc.id)
                                                }
                                                className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded hover:bg-indigo-100 font-bold"
                                            >
                                                Elegir
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
                    <div>
                        {docSearchMeta.totalRecords > 0
                            ? `Mostrando ${docSearchResults.length} de ${docSearchMeta.totalRecords} registros`
                            : 'Sin registros'}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => fetchDocumentsPage(Math.max(1, docSearchPage - 1))}
                            disabled={isSearchingDocs || docSearchPage <= 1}
                            className="px-3 py-1.5 rounded border border-slate-300 bg-white text-slate-700 disabled:opacity-40"
                        >
                            Anterior
                        </button>
                        <span className="font-semibold">
                            Página {docSearchMeta.currentPage} de {docSearchMeta.totalPages}
                        </span>
                        <button
                            type="button"
                            onClick={() => fetchDocumentsPage(docSearchPage + 1)}
                            disabled={isSearchingDocs || docSearchPage >= docSearchMeta.totalPages}
                            className="px-3 py-1.5 rounded border border-slate-300 bg-white text-slate-700 disabled:opacity-40"
                        >
                            Siguiente
                        </button>
                    </div>
                </div>
            </Modal>

            {/* MODALES REUTILIZADOS DE TRANSPORTE */}
            {showUnidadModal && (
                <UnidadFormModal 
                    isOpen={showUnidadModal} 
                    onClose={() => setShowUnidadModal(false)} 
                    onSuccess={() => { 
                        reloadCatalogs(); 
                        setShowUnidadModal(false); 
                    }} 
                    unitToEdit={unidadToEdit} 
                />
            )}

            {showConductorModal && (
                <ConductorFormModal 
                    isOpen={showConductorModal} 
                    onClose={() => setShowConductorModal(false)} 
                    onSuccess={() => { 
                        reloadCatalogs(); 
                        setShowConductorModal(false); 
                    }} 
                    conductorToEdit={conductorToEdit} 
                />
            )}

            {showTransportistaModal && (
                <TransportistaFormModal
                    isOpen={showTransportistaModal}
                    onClose={() => setShowTransportistaModal(false)}
                    onSuccess={() => {
                        reloadCatalogs();
                        setShowTransportistaModal(false);
                    }}
                    transportistaToEdit={transportistaToEdit}
                />
            )}
        </div>
    );
}
