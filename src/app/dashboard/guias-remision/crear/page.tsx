// src/app/dashboard/guias-remision/crear/page.tsx
"use client";
import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { format, isBefore, parseISO, subDays } from 'date-fns';

// Servicios y Tipos
import { guiaRemisionService } from '@/services/guiaRemisionService';
import { productoService } from '@/services/productoService';
import { presentacionService } from '@/services/presentacionService'; 
import { documentoCompraService } from '@/services/documentoCompraService'; 
import documentoVentaService from '@/services/documentoVentaService';
import { catalogService } from '@/services/catalogService';
import { useCatalogs } from '@/hooks/useCatalogs'; 
import { GuiaRemisionPayload, GuiaRemisionDetalle } from '@/types/guiaRemision.types';
import type { DocumentoCompra } from '@/types/documentoCompra.types';
import type { DocumentoVenta } from '@/types/documentoVenta.types';

import UnidadFormModal from '@/app/dashboard/unidad-transporte/components/UnidadFormModal';
import ConductorFormModal from '@/app/dashboard/conductores/components/ConductorFormModal';
import TransportistaFormModal from '@/app/dashboard/transportistas/components/TransportistaFormModal';
import { unidadTransporteService } from '@/services/unidadTransporteService';
import { conductorService } from '@/services/conductorService';
import { transportistaService } from '@/services/transportistaService';

import SearchableSelect from '@/components/forms/SearchableSelect';
import Modal from '@/components/ui/Modal'; 
import { 
    IconDeviceFloppy, IconSend, IconPlus, IconTrash, IconArrowLeft,
    IconMapPin, IconTruck, IconPackage, IconFileDescription, IconFileInvoice,
    IconBarcode, IconEdit, IconSearch, IconLoader, IconX
} from '@tabler/icons-react';

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
    
    const EMPRESA_ID = "005";
    const ALMACEN_ID = "001"; 
    const USER_ID = "CU0001";
    const TENANT_ID = 1; 
    const ruc = "20100100100";

    const [loading, setLoading] = useState(false);
    const [products, setProducts] = useState<any[]>([]);
    const [productOptions, setProductOptions] = useState<any[]>([]);
    const [productSearchTerm, setProductSearchTerm] = useState('');
    const productSearchReqIdRef = useRef(0);
    
    const [isManualCorrelativo, setIsManualCorrelativo] = useState(false);
    const [docRefParts, setDocRefComponents] = useState({ serie: '', numero: '' });

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const thirtyDaysAgoStr = format(subDays(new Date(), 30), 'yyyy-MM-dd');

    const { catalogs, loadingCatalogs, refreshCatalogs } = useCatalogs([
        'TipoDocumentoComercial',
        'Moneda',
        'MotivoTraslado',
        'UnidadMedida',
        { endpoint: 'AlmacenSerie', params: { empresaId: EMPRESA_ID } },
        { endpoint: 'Almacen', params: { empresaId: EMPRESA_ID } },
        { endpoint: 'Cliente', params: { tenantId: TENANT_ID, pageSize: 5000 } },
        { endpoint: 'Proveedor', params: { tenantId: TENANT_ID, pageSize: 5000 } },
        { endpoint: 'Transportista', params: { empresaId: EMPRESA_ID } },
        { endpoint: 'UnidadTransporte', params: { empresaId: EMPRESA_ID } },
        { endpoint: 'ConductorTransporte', params: { empresaId: EMPRESA_ID } }
    ]);

    const initialFormData: Partial<GuiaRemisionPayload> = {
        empresaId: EMPRESA_ID, cuentausuarioId: USER_ID, tipodoccomercialId: '', 
        tipomovimientoId: 'S', serie: '', correlativo: '', fecha_emision: todayStr, 
        fecha_traslado: todayStr, fecha_doc: todayStr, doc_referencia:'', 
        doc_referencia_numero: '', documentoReferencia: '', documentoReferenciaTipo: '', 
        foto_guiaremision: '', monedaId: '001', tipo_cambio: 1.0, estado: 'REGISTRADO',
        estado_documento_sunat: 'PENDIENTEXML', incluye_igv: true, clienteId: '',
        proveedorId: '', puntoventaId: '', trabajadorId: '', id_almacen_inicio: ALMACEN_ID, 
        id_almacen_destino: '', motivotrasladoId: '', otro_motivo_traslado: '',
        transportistaId: '', conductorId: '', unidadTransporteId: '', punto_partida: '',
        punto_llegada: '', observacion: '' 
    };
    const [formData, setFormData] = useState<Partial<GuiaRemisionPayload>>(initialFormData);

    const [showUnidadModal, setShowUnidadModal] = useState(false);
    const [unidadToEdit, setUnidadToEdit] = useState<any>(null);
    const [showConductorModal, setShowConductorModal] = useState(false);
    const [conductorToEdit, setConductorToEdit] = useState<any>(null);
    const [showTransportistaModal, setShowTransportistaModal] = useState(false);
    const [transportistaToEdit, setTransportistaToEdit] = useState<any>(null);

    const [showDocModal, setShowDocModal] = useState(false);
    const [isSearchingDocs, setIsSearchingDocs] = useState(false);
    const initialDocSearchFilters = { tipoDocId: '', entidadId: '', numero: '', monedaId: '001', fechaIni: thirtyDaysAgoStr, fechaFin: todayStr };
    const [docSearchFilters, setDocSearchFilters] = useState(initialDocSearchFilters);
    const [docSearchResults, setDocSearchResults] = useState<any[]>([]);
    const DOC_SEARCH_PAGE_SIZE = 20;
    const [docSearchPage, setDocSearchPage] = useState(1);
    const [docSearchMeta, setDocSearchMeta] = useState({ currentPage: 1, totalPages: 1, totalRecords: 0 });
    const [docSearchHasSearched, setDocSearchHasSearched] = useState(false);
    const [importedReferenceDoc, setImportedReferenceDoc] = useState<{ id: string; type: 'COMPRA' | 'VENTA'; } | null>(null);
    const [forcedMt00006Client, setForcedMt00006Client] = useState<any | null>(null);
    const [forcedImportedClient, setForcedImportedClient] = useState<any | null>(null);
    const [clienteOptionsRemote, setClienteOptionsRemote] = useState<any[]>([]);
    const [clienteSearchTerm, setClienteSearchTerm] = useState('');
    const [providerOptions, setProviderOptions] = useState<any[]>([]);
    const [providerSearchTerm, setProviderSearchTerm] = useState('');
    const [transportistaOptions, setTransportistaOptions] = useState<any[]>([]);
    const [transportistaSearchTerm, setTransportistaSearchTerm] = useState('');
    const [unidadTransporteOptions, setUnidadTransporteOptions] = useState<any[]>([]);
    const [unidadTransporteSearchTerm, setUnidadTransporteSearchTerm] = useState('');
    const [conductorOptions, setConductorOptions] = useState<any[]>([]);
    const [conductorSearchTerm, setConductorSearchTerm] = useState('');
    const clienteCatalog = useMemo(() => catalogs['Cliente'] || [], [catalogs]);
    const proveedorCatalog = useMemo(() => catalogs['Proveedor'] || [], [catalogs]);
    const transportistaCatalog = useMemo(() => catalogs['Transportista'] || [], [catalogs]);
    const unidadTransporteCatalog = useMemo(() => catalogs['UnidadTransporte'] || [], [catalogs]);
    const conductorCatalog = useMemo(() => catalogs['ConductorTransporte'] || [], [catalogs]);

    const [items, setItems] = useState<GuiaRemisionDetalle[]>([]);

    const mapProductToOption = (p: any) => ({
        key: String(p.bienId || '').trim(), // ID real para grabar en detalle
        value: String(p.bienId || '').trim(), // Valor técnico: debe ser ID para que funcione U.M./presentaciones
        label: String(p.descripcion || '').trim(), // Texto visible principal
        aux: String(p.codigo_existencia || '').trim(), // Código de existencia visible como secundario
        raw: p
    });

    const docTypeOptions = useMemo(() => {
        const opciones = catalogs['TipoDocumentoComercial']?.filter((t: any) => t.originalData?.tipodoccomercialId !== 'X030') || [];
        const guiaRemitente = opciones.find((x: any) => x.value === 'X029');
        return guiaRemitente ? [guiaRemitente] : opciones;
    }, [catalogs]);

    const filteredSeries = useMemo(() => {
        return catalogs['AlmacenSerie']?.filter((s: any) => 
            String(s.originalData?.almacenId).trim() === ALMACEN_ID && 
            String(s.originalData?.tipodoccomercialId).trim() === formData.tipodoccomercialId
        ) || [];
    }, [catalogs, formData.tipodoccomercialId]);

    const documentoReferenciaTipoJSON = useMemo(() => {
        return catalogs['TipoDocumentoComercial']?.filter((t: any) => {
            const codSunat = t.originalData?.codtablaSunat;
            const tablaRef = String(t.originalData?.tabla_referencia || '').toLowerCase();
            return ['01', '03'].includes(codSunat) && tablaRef.includes('documento_venta');
        }).map((t: any) => ({
            key: t.value, value: t.label, codSunat: t.originalData?.codtablaSunat, aux: t.originalData?.tabla_referencia
        })) || [];
    }, [catalogs]);

    const motivoTrasladoOptions = useMemo(() => {
        return (catalogs['MotivoTraslado'] || []).filter((m: any) => {
            const estado = m?.originalData?.estado ?? m?.estado;
            return estado === true || estado === 1 || estado === '1';
        });
    }, [catalogs]);

    useEffect(() => {
        if (docTypeOptions.length > 0 && !formData.tipodoccomercialId) {
            setFormData(prev => ({ ...prev, tipodoccomercialId: docTypeOptions[0].value }));
        }

        const fetchProducts = async () => {
            const resProducts = await productoService.getByEmpresa(EMPRESA_ID, 1, 500); 
            if (resProducts.isSuccess) {
                const mappedProds = (resProducts.data || [])
                    .filter((p: any) => p.estado !== 0 && p.estado !== false && p.estado !== '0')
                    .map(mapProductToOption);
                setProducts(mappedProds);
                setProductOptions(mappedProds);
            }
        };
        fetchProducts();
    }, [docTypeOptions]);

    const mergeProductOptions = (...lists: any[][]) => {
        const seen = new Set<string>();
        const result: any[] = [];
        lists.flat().forEach((opt: any) => {
            const id = String(opt?.key || '').trim();
            if (!id || seen.has(id)) return;
            seen.add(id);
            result.push(opt);
        });
        return result;
    };

    const sameProductIds = (a: any[], b: any[]) => {
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
            if (String(a[i]?.key || '').trim() !== String(b[i]?.key || '').trim()) return false;
        }
        return true;
    };

    const findProductById = (bienId: string) => {
        const targetId = String(bienId || '').trim();
        if (!targetId) return null;
        return (
            productOptions.find((x: any) => String(x.key || '').trim() === targetId) ||
            products.find((x: any) => String(x.key || '').trim() === targetId) ||
            null
        );
    };

    useEffect(() => {
        if (productSearchTerm.trim()) return;
        setProductOptions(prev => {
            const selectedIds = Array.from(new Set(items.map((it: any) => String(it?.bienId || '').trim()).filter(Boolean)));
            const selectedFromPrev = selectedIds
                .map(id => prev.find((x: any) => String(x.key || '').trim() === id))
                .filter(Boolean);
            const selectedFromBase = selectedIds
                .map(id => products.find((x: any) => String(x.key || '').trim() === id))
                .filter(Boolean);

            const next = mergeProductOptions(selectedFromPrev as any[], selectedFromBase as any[], products);
            return sameProductIds(prev, next) ? prev : next;
        });
    }, [products, items, productSearchTerm]);

    const handleProductSearch = async (term: string) => {
        const normalizedTerm = String(term || '').replace(/\s+/g, ' ').trim();
        setProductSearchTerm(normalizedTerm);
        const requestId = ++productSearchReqIdRef.current;

        if (!normalizedTerm) {
            setProductOptions(prev => {
                const selectedIds = Array.from(new Set(items.map((it: any) => String(it?.bienId || '').trim()).filter(Boolean)));
                const selectedFromPrev = selectedIds
                    .map(id => prev.find((x: any) => String(x.key || '').trim() === id))
                    .filter(Boolean);
                const selectedFromBase = selectedIds
                    .map(id => products.find((x: any) => String(x.key || '').trim() === id))
                    .filter(Boolean);
                const next = mergeProductOptions(selectedFromPrev as any[], selectedFromBase as any[], products);
                return sameProductIds(prev, next) ? prev : next;
            });
            return;
        }

        try {
            const res = await productoService.getByEmpresa(EMPRESA_ID, 1, 100, normalizedTerm);
            // Si llega una respuesta vieja, la ignoramos para no pisar la búsqueda actual.
            if (requestId !== productSearchReqIdRef.current) return;
            const remote = (res?.data || [])
                .filter((p: any) => p.estado !== 0 && p.estado !== false && p.estado !== '0')
                .map(mapProductToOption);

            setProductOptions(prev => {
                const selectedIds = Array.from(new Set(items.map((it: any) => String(it?.bienId || '').trim()).filter(Boolean)));
                const selectedFromPrev = selectedIds
                    .map(id => prev.find((x: any) => String(x.key || '').trim() === id))
                    .filter(Boolean);
                const selectedFromBase = selectedIds
                    .map(id => products.find((x: any) => String(x.key || '').trim() === id))
                    .filter(Boolean);
                const next = mergeProductOptions(
                    selectedFromPrev as any[],
                    selectedFromBase as any[],
                    remote
                );
                return sameProductIds(prev, next) ? prev : next;
            });
        } catch {
            // No limpiamos el DDL por fallo puntual de red.
        }
    };

    const mergeProviderOptions = (...lists: any[][]) => {
        const seen = new Set<string>();
        const result: any[] = [];
        lists.flat().forEach((opt: any) => {
            const id = String(opt?.value || '').trim();
            if (!id || seen.has(id)) return;
            seen.add(id);
            result.push(opt);
        });
        return result;
    };

    const sameProviderIds = (a: any[], b: any[]) => {
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
            if (String(a[i]?.value || '').trim() !== String(b[i]?.value || '').trim()) return false;
        }
        return true;
    };

    useEffect(() => {
        // Cuando hay texto de búsqueda, no pisamos los resultados remotos.
        if (providerSearchTerm.trim()) return;

        const catalogProviders = proveedorCatalog as any[];
        setProviderOptions(prev => {
            const selectedId = String(formData.proveedorId || '').trim();
            const selectedFromPrev = prev.find((x: any) => String(x.value || '').trim() === selectedId);
            const selectedFromCatalog = catalogProviders.find((x: any) => String(x.value || '').trim() === selectedId);

            const next = mergeProviderOptions(
                selectedFromPrev ? [selectedFromPrev] : [],
                selectedFromCatalog ? [selectedFromCatalog] : [],
                catalogProviders
            );

            return sameProviderIds(prev, next) ? prev : next;
        });
    }, [proveedorCatalog, formData.proveedorId, providerSearchTerm]);

    useEffect(() => {
        if (filteredSeries.length > 0) {
            const isValid = filteredSeries.some(s => s.value === formData.serie);
            if (!isValid) setFormData(prev => ({ ...prev, serie: filteredSeries[0].value }));
        } else {
            setFormData(prev => ({ ...prev, serie: '' }));
        }
    }, [filteredSeries]);

    useEffect(() => {
        const fetchCorrelativo = async () => {
            if (!isManualCorrelativo && formData.tipodoccomercialId && formData.serie) {
                try {
                    const res = await guiaRemisionService.getSiguienteCorrelativo(formData.tipodoccomercialId, formData.serie);
                    if (res.isSuccess && res.data) {
                        setFormData(prev => ({ ...prev, correlativo: res.data.correlativo }));
                    }
                } catch (error) { console.error("Error al obtener correlativo", error); }
            } else if (isManualCorrelativo && !formData.correlativo) {
                setFormData(prev => ({ ...prev, correlativo: '' }));
            }
        };
        fetchCorrelativo();
    }, [formData.tipodoccomercialId, formData.serie, isManualCorrelativo]);

    const getMotivoRules = (motivoId: string) => {
        switch (motivoId) {
            case 'MT00003': case 'MT00008': return { showProv: true, showCli: false, showDestAlmacen: false, start: 'PROV', end: 'ALM_ORIG', refType: 'COMPRA' };
            case 'MT00004': case 'MT00001': case 'MT00002': case 'MT00009': return { showProv: false, showCli: true, showDestAlmacen: false, start: 'ALM_ORIG', end: 'CLI', refType: 'VENTA' };
            case 'MT00005': return { showProv: false, showCli: true, showDestAlmacen: false, start: 'CLI', end: 'ALM_ORIG', refType: 'VENTA' };
            case 'MT00013': return { showProv: false, showCli: true, showDestAlmacen: false, start: 'ALM_ORIG', end: 'CLI', allowManual: true, refType: 'VENTA' };
            case 'MT00007': return { showProv: true, showCli: false, showDestAlmacen: false, start: 'ALM_ORIG', end: 'PROV', refType: 'COMPRA' };
            case 'MT00006': return { showProv: false, showCli: true, showDestAlmacen: true, start: 'ALM_ORIG', end: 'ALM_DEST', refType: 'VENTA' }; 
            default: return { showProv: false, showCli: false, showDestAlmacen: false, start: '', end: '', allowManual: false, refType: '' };
        }
    };

    const currentRules = useMemo(() => getMotivoRules(formData.motivotrasladoId || ''), [formData.motivotrasladoId]);
    const shouldSendToSunat = useMemo(() => {
        const selectedSerie = filteredSeries.find((s: any) => s.value === formData.serie);
        return (selectedSerie?.originalData?.enviarSunat || '').toUpperCase() === 'SI';
    }, [filteredSeries, formData.serie]);

    const REFERENCE_REQUIRED_MOTIVOS = ['MT00001', 'MT00002', 'MT00003', 'MT00004', 'MT00013'];
    const requiresDocumentReference = REFERENCE_REQUIRED_MOTIVOS.includes(formData.motivotrasladoId || '');
    const canSearchDocument = requiresDocumentReference;

    useEffect(() => {
        if (!formData.motivotrasladoId) return;

        const findProveedorById = (proveedorId: string) => {
            const targetId = String(proveedorId || '').trim();
            if (!targetId) return null;
            const fromProviderOptions = providerOptions.find((x: any) => String(x.value || '').trim() === targetId);
            if (fromProviderOptions) return fromProviderOptions;
            return (catalogs['Proveedor'] || []).find((x: any) => String(x.value || '').trim() === targetId) || null;
        };

        const getAddress = (sourceType: string) => {
            if (sourceType === 'ALM_ORIG') return catalogs['Almacen']?.find((x:any) => x.value === formData.id_almacen_inicio)?.originalData?.direccion1 || '';
            if (sourceType === 'ALM_DEST') return catalogs['Almacen']?.find((x:any) => x.value === formData.id_almacen_destino)?.originalData?.direccion1 || '';
            if (sourceType === 'CLI') {
                const clienteId = String(formData.clienteId || '').trim();
                const fromCatalog = catalogs['Cliente']?.find((x:any) => String(x.value || '').trim() === clienteId);
                if (fromCatalog?.originalData?.direccion) return fromCatalog.originalData.direccion;
                if (forcedImportedClient && String(forcedImportedClient.value || '').trim() === clienteId) {
                    return forcedImportedClient.originalData?.direccion || '';
                }
                return '';
            }
            if (sourceType === 'PROV') return findProveedorById(String(formData.proveedorId || ''))?.originalData?.direccion || '';
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

    }, [formData.motivotrasladoId, formData.clienteId, formData.proveedorId, formData.id_almacen_inicio, formData.id_almacen_destino, currentRules, catalogs, forcedImportedClient, providerOptions]);

    const normalizeDoc = (doc: unknown) => String(doc || '').replace(/\D/g, '').trim();
    const targetRuc = normalizeDoc(ruc);
    const getClienteDoc = (cliente: any) =>
        normalizeDoc(
            cliente?.originalData?.num_docident ||
            cliente?.originalData?.numDocIdent ||
            cliente?.originalData?.numero_doc ||
            cliente?.originalData?.nro_documento ||
            cliente?.num_docident ||
            cliente?.numDocIdent ||
            cliente?.numero_doc ||
            cliente?.nro_documento ||
            cliente?.aux ||
            ''
        );
    const findCompanyClient = () => {
        const inCatalog = (catalogs['Cliente'] || []).find((c: any) => getClienteDoc(c) === targetRuc);
        if (inCatalog) return inCatalog;
        return forcedMt00006Client;
    };

    const mergeClienteOptions = (...lists: any[][]) => {
        const seen = new Set<string>();
        const result: any[] = [];
        lists.flat().forEach((opt: any) => {
            const id = String(opt?.value || '').trim();
            if (!id || seen.has(id)) return;
            seen.add(id);
            result.push(opt);
        });
        return result;
    };

    const sameClienteIds = (a: any[], b: any[]) => {
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
            if (String(a[i]?.value || '').trim() !== String(b[i]?.value || '').trim()) return false;
        }
        return true;
    };

    const clienteOptions = useMemo(() => {
        let options = clienteSearchTerm.trim() ? clienteOptionsRemote : clienteCatalog;
        if (formData.motivotrasladoId === 'MT00006') {
            const inCatalog = options.filter((c:any) => getClienteDoc(c) === targetRuc);
            if (inCatalog.length > 0) return inCatalog;
            return forcedMt00006Client ? [forcedMt00006Client] : [];
        }
        if (forcedImportedClient) {
            const exists = options.some((c: any) => String(c.value) === String(forcedImportedClient.value));
            if (!exists) options = [...options, forcedImportedClient];
        }
        return options;
    }, [clienteCatalog, clienteOptionsRemote, clienteSearchTerm, formData.motivotrasladoId, forcedMt00006Client, forcedImportedClient]);

    const handleClienteSearch = async (term: string) => {
        setClienteSearchTerm(term);
        if (formData.motivotrasladoId === 'MT00006') return;

        if (!term.trim()) {
            setClienteOptionsRemote([]);
            return;
        }

        try {
            const results = await catalogService.getDynamicCatalog('Cliente', {
                tenantId: String(TENANT_ID),
                pageSize: 100,
                search: term || undefined
            });

            setClienteOptionsRemote(prev => {
                const selectedId = String(formData.clienteId || '').trim();
                const selectedFromPrev = prev.find((x: any) => String(x.value || '').trim() === selectedId);
                const selectedFromCatalog = (clienteCatalog || []).find((x: any) => String(x.value || '').trim() === selectedId);
                const selectedImported =
                    forcedImportedClient && String(forcedImportedClient.value || '').trim() === selectedId
                        ? forcedImportedClient
                        : null;

                const next = mergeClienteOptions(
                    selectedFromPrev ? [selectedFromPrev] : [],
                    selectedFromCatalog ? [selectedFromCatalog] : [],
                    selectedImported ? [selectedImported] : [],
                    results as any[]
                );
                return sameClienteIds(prev, next) ? prev : next;
            });
        } catch {
            // no-op para no limpiar el DDL si falla una búsqueda remota puntual
        }
    };

    useEffect(() => {
        const loadCompanyClientIfMissing = async () => {
            if (formData.motivotrasladoId !== 'MT00006') return;
            if (findCompanyClient()) return;
            try {
                const results = await catalogService.getDynamicCatalog('Cliente', {
                    tenantId: String(TENANT_ID),
                    search: ruc,
                    pageSize: 50
                });
                const companyClient = results.find((c: any) => getClienteDoc(c) === targetRuc) || null;
                if (companyClient) setForcedMt00006Client(companyClient);
            } catch {
                // no-op: evitamos romper UI por fallo de red puntual
            }
        };
        loadCompanyClientIfMissing();
    }, [formData.motivotrasladoId, catalogs, ruc, targetRuc, TENANT_ID]);

    useEffect(() => {
        if (formData.motivotrasladoId !== 'MT00006') return;
        const companyClient = findCompanyClient() || clienteOptions[0];
        const expectedClienteId = String(companyClient?.value || '').trim();
        if (!expectedClienteId) return;
        if (String(formData.clienteId || '').trim() === expectedClienteId) return;

        setFormData(prev => ({ ...prev, clienteId: expectedClienteId }));
    }, [formData.motivotrasladoId, formData.clienteId, clienteOptions, catalogs]);

    const handleChange = (e: any) => {
        const { name, value } = e.target;
        
        if (name === 'fecha_traslado') {
            const fEmision = parseISO(formData.fecha_emision!);
            const fTraslado = parseISO(value);
            if (isBefore(fTraslado, fEmision)) toast.warning("La fecha de traslado no puede ser menor a la fecha de emisión");
        }

        if (name === 'fecha_emision') {
            setFormData(prev => ({ ...prev, [name]: value, fecha_doc: value }));
        } 
        else if (name === 'motivotrasladoId') {
            const requiresReference = REFERENCE_REQUIRED_MOTIVOS.includes(value);
            let autoClienteId = '';
            
            if (value === 'MT00006' && catalogs['Cliente']) {
                const clienteMismaEmpresa = findCompanyClient();
                if (clienteMismaEmpresa) autoClienteId = String(clienteMismaEmpresa.value || '').trim();
            }

            setFormData(prev => ({ 
                ...prev, 
                [name]: value,
                clienteId: autoClienteId,
                proveedorId: '', id_almacen_destino: '', otro_motivo_traslado: '',
                ...(requiresReference ? {} : { documentoReferencia: '', documentoReferenciaTipo: '', doc_referencia: '', doc_referencia_numero: '' })
            }));
            
            if (!requiresReference) {
                setDocRefComponents({ serie: '', numero: '' });
                setImportedReferenceDoc(null);
            }
        }
        else if (name === 'documentoReferenciaTipo') {
            const selectedOption = documentoReferenciaTipoJSON.find((t: any) => t.codSunat === value);
            setFormData(prev => ({ ...prev, [name]: value, doc_referencia: selectedOption ? selectedOption.aux : '' }));
        } 
        else {
            setFormData(prev => ({ ...prev, [name]: value }));
        }
    };

    const handleDocRefChange = (field: 'serie' | 'numero', value: string) => {
        const newParts = { ...docRefParts, [field]: value };
        setDocRefComponents(newParts);
        setFormData(prev => ({ ...prev, documentoReferencia: `${newParts.serie} - ${newParts.numero}` }));
    };

    const handleAddItem = () => {
        setItems([...items, { item: items.length + 1, cantidad: 1, bienId: '', unidad_aux: '', descripcion_aux: '', peso_bruto: 0, unidades_opciones: [] } as any]);
    };

    const handleRemoveItem = (index: number) => setItems(items.filter((_, i) => i !== index));

    const handleItemChange = async (index: number, field: string, value: any) => {
        setItems(prevItems => {
            const newItems = [...prevItems];
            newItems[index] = { ...newItems[index], [field]: value };
            
            if (field === 'bienId') {
                const p = findProductById(String(value));
                if (p) {
                    newItems[index].descripcion_aux = p.value;
                    newItems[index].unidades_opciones = [{ key: '', value: 'Cargando...' }];
                }
            }
            return newItems;
        });

        if (field === 'bienId' && value) {
            const p = findProductById(String(value));
            if (!p) return;

            try {
                const res = await presentacionService.getByBien(value);
                
                let opcionesUM: any[] = [];
                const unidadBaseKey = p.raw?.unidadmedidaId || 'NIU';
                let hasBaseUnitInPresentations = false;

                if (res.isSuccess && res.data && res.data.length > 0) {
                    res.data.forEach((pres: any) => {
                        const presKey = pres.unidadmedidaId?.trim(); 
                        if (presKey === unidadBaseKey?.trim()) hasBaseUnitInPresentations = true;
                        opcionesUM.push({ key: presKey, value: pres.descripcion || presKey, presentacionId: pres.presentacionId });
                    });
                }

                if (!hasBaseUnitInPresentations) {
                    const catUnidad = catalogs['UnidadMedida']?.find((u: any) => u.value === unidadBaseKey);
                    const nombreDesdeProducto = p.raw?.unidadMedidaDesc; 
                    const unidadBaseDesc = catUnidad?.label || nombreDesdeProducto || unidadBaseKey;
                    opcionesUM.unshift({ key: unidadBaseKey, value: `${unidadBaseDesc} 1`, presentacionId: p.raw?.presentacionId || null });
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

    const filterImportableItems = (mappedItems: GuiaRemisionDetalle[]) => {
        const productKeys = new Set(products.map((p: any) => String(p.key)));
        const notImportable: string[] = [];
        const allowed = mappedItems.filter((it: any) => {
            const bienId = String(it?.bienId || '').trim();
            const canImport = bienId && productKeys.has(bienId);
            if (!canImport) notImportable.push(String(it?.descripcion_aux || `BIEN ${bienId}`));
            return canImport;
        });

        if (notImportable.length > 0) {
            toast.error(`No se importaron productos inactivos/no disponibles: ${notImportable.join(', ')}`);
        }

        return allowed;
    };

    const mapCompraDetallesToGuiaItems = (compra: DocumentoCompra): GuiaRemisionDetalle[] => {
        if (!Array.isArray(compra?.detalles)) return [];
        return compra.detalles.map((detalle: any, idx: number) => {
            // 🚀 LIMPIEZA PROFUNDA DE IDs
            const bienIdLimpio = detalle?.bienId ? String(detalle.bienId).trim() : '';
            const presentacionIdLimpia = detalle?.presentacionId ? String(detalle.presentacionId).trim() : '';
            const cantidadNum = Number(detalle?.cantidad ?? 0) || 0;
            
            return {
                item: idx + 1, 
                bienId: bienIdLimpio, // Usamos el ID limpio
                presentacionId: presentacionIdLimpia || null, 
                cantidad: cantidadNum,
                conversion_total: Number(detalle?.conversionTotal ?? 0) || 0, 
                precio: Number(detalle?.costo ?? 0), 
                costo: Number(detalle?.costo ?? 0),
                importe: Number(detalle?.importe ?? 0), 
                Saldo_cantidad: Number(detalle?.saldoCantidad ?? cantidadNum),
                descuento_producto: Number(detalle?.descuentoProducto ?? 0), 
                afecto_inafecto: Boolean(detalle?.afectoInafecto),
                observacion: detalle?.observacion ?? '', 
                documentoId: compra.documentocompraId, 
                tabla_documento: 'DOCUMENTO_COMPRA',
                saldo_temporal: Number(detalle?.saldoTemporal ?? cantidadNum), 
                descripcion_aux: detalle?.bien?.descripcion || '',
                unidad_aux: presentacionIdLimpia, 
                unidades_opciones: [{ 
                    key: presentacionIdLimpia, 
                    value: detalle?.presentacion?.descripcion || presentacionIdLimpia || '-', 
                    presentacionId: presentacionIdLimpia || null 
                }]
            } as any;
        });
    };

const mapVentaDetallesToGuiaItems = (venta: DocumentoVenta): GuiaRemisionDetalle[] => {
        if (!Array.isArray(venta?.detalles)) return [];
        return venta.detalles.map((detalle: any, idx: number) => {
            // 🚀 LIMPIEZA PROFUNDA DE IDs
            const bienIdLimpio = detalle?.bienId ? String(detalle.bienId).trim() : '';
            const presentacionIdLimpia = detalle?.presentacionId ? String(detalle.presentacionId).trim() : '';
            const cantidadNum = Number(detalle?.cantidad ?? 0) || 0;
            
            return {
                item: idx + 1, 
                bienId: bienIdLimpio, // Usamos el ID limpio
                presentacionId: presentacionIdLimpia || null, 
                cantidad: cantidadNum,
                conversion_total: Number(detalle?.conversionTotal ?? 0) || 0, 
                precio: Number(detalle?.precio ?? 0), 
                costo: Number(detalle?.precio ?? 0),
                importe: Number(detalle?.importe ?? 0), 
                Saldo_cantidad: Number(detalle?.saldoCantidad ?? cantidadNum),
                descuento_producto: Number(detalle?.descuentoProducto ?? 0), 
                afecto_inafecto: Boolean(detalle?.afectoInafecto),
                observacion: detalle?.observacion ?? '', 
                documentoId: venta.documentoventaId, 
                tabla_documento: 'DOCUMENTO_VENTA',
                saldo_temporal: Number(detalle?.saldoTemporal ?? cantidadNum), 
                descripcion_aux: detalle?.bien?.descripcion || '',
                unidad_aux: presentacionIdLimpia, 
                unidades_opciones: [{ 
                    key: presentacionIdLimpia, 
                    value: detalle?.presentacion?.descripcion || presentacionIdLimpia || '-', 
                    presentacionId: presentacionIdLimpia || null 
                }]
            } as any;
        });
    };

    const handleSelectCompraDocument = async (documentocompraId: string) => {
        if (!documentocompraId) return toast.error('Documento de compra inválido');
        setIsSearchingDocs(true);
        try {
            const res = await documentoCompraService.getById(documentocompraId);
            if (!res?.isSuccess || !res?.data) return toast.error(res?.message || 'No se pudo obtener el documento de compra');
            
            const compra = res.data;
            const referencia = [(compra.serie || '').trim(), (compra.numero || '').trim()].filter(Boolean).join(' - ');
            const refTypeOption = documentoReferenciaTipoJSON.find((t: any) => 
                String(t.key).trim() === String(compra.tipodoccomercialId).trim() || 
                String(t.value).trim().toUpperCase() === String(compra.tipoDocumentoComercial?.descripcion || '').trim().toUpperCase()
            );
            // 🚀 BÚSQUEDA Y FORMATEO SEGURO DEL ID DEL PROVEEDOR
            const rawProveedorId = compra.proveedorId || compra.id_proveedor || compra.proveedor?.proveedorId || '';
            const provIdSeguro = rawProveedorId 
                ? (!isNaN(Number(rawProveedorId)) ? String(rawProveedorId).trim().padStart(5, '0') : String(rawProveedorId).trim()) 
                : '';

            setDocRefComponents({ serie: (compra.serie || '').trim(), numero: (compra.numero || '').trim() });
            
            setFormData((prev) => ({
                ...prev, 
                proveedorId: provIdSeguro || prev.proveedorId, 
                monedaId: compra.monedaId ? String(compra.monedaId).trim() : prev.monedaId,
                documentoReferencia: referencia || prev.documentoReferencia, 
                documentoReferenciaTipo: refTypeOption?.codSunat || prev.documentoReferenciaTipo,
                doc_referencia: refTypeOption?.aux || prev.doc_referencia, 
                doc_referencia_numero: compra.documentocompraId || prev.doc_referencia_numero
            }));
            
            const mappedItems = mapCompraDetallesToGuiaItems(compra);
            if (mappedItems.length > 0) {
                const allowedItems = filterImportableItems(mappedItems);
                setItems(allowedItems);
            }
            
            setImportedReferenceDoc({ id: compra.documentocompraId, type: 'COMPRA' });
            setShowDocModal(false);
            toast.success('Documento de compra importado');
        } catch (error: any) { toast.error(error?.response?.data?.message || 'Error al importar documento'); } 
        finally { setIsSearchingDocs(false); }
    };

    const handleSelectVentaDocument = async (documentoventaId: string) => {
        if (!documentoventaId) return toast.error('Documento inválido');
        setIsSearchingDocs(true);
        try {
            const venta = await documentoVentaService.getById(documentoventaId);
            if (!venta?.documentoventaId) return toast.error('No se pudo obtener el documento');

            const referencia = [(venta.serie || '').trim(), (venta.numero || '').trim()].filter(Boolean).join(' - ');
            const refTypeOption = documentoReferenciaTipoJSON.find((t: any) => 
                String(t.key).trim() === String(venta.tipodoccomercialId).trim() || 
                String(t.value).trim().toUpperCase() === String(venta.tipoDocumentoComercial?.descripcion || '').trim().toUpperCase()
            );

            // 🚀 BÚSQUEDA Y FORMATEO SEGURO DEL ID DEL CLIENTE (Limpia espacios y rellena 0s si es numérico)
            const rawClienteId = venta.clienteId || venta.id_cliente || venta.cliente?.clienteId || '';
            const cliIdSeguro = rawClienteId 
                ? (!isNaN(Number(rawClienteId)) ? String(rawClienteId).trim().padStart(5, '0') : String(rawClienteId).trim()) 
                : '';
            const clienteExisteEnCatalogo = (catalogs['Cliente'] || []).some(
                (c: any) => String(c.value || '').trim() === cliIdSeguro
            );
            if (cliIdSeguro && !clienteExisteEnCatalogo) {
                setForcedImportedClient({
                    key: cliIdSeguro,
                    value: cliIdSeguro,
                    label: venta.cliente?.descripcion || `CLIENTE ${cliIdSeguro}`,
                    aux: venta.cliente?.numDocIdent || '',
                    originalData: {
                        clienteId: cliIdSeguro,
                        descripcion: venta.cliente?.descripcion || `CLIENTE ${cliIdSeguro}`,
                        num_docident: venta.cliente?.numDocIdent || '',
                        direccion: venta.cliente?.direccion || ''
                    }
                });
                toast.warning(`Cliente importado fuera del catálogo actual: ${venta.cliente?.descripcion || cliIdSeguro}`);
            }

            setDocRefComponents({ serie: (venta.serie || '').trim(), numero: (venta.numero || '').trim() });
            
            setFormData((prev) => ({
                ...prev, 
                clienteId: cliIdSeguro || prev.clienteId, 
                monedaId: venta.monedaId ? String(venta.monedaId).trim() : prev.monedaId,
                documentoReferencia: referencia || prev.documentoReferencia, 
                documentoReferenciaTipo: refTypeOption?.codSunat || prev.documentoReferenciaTipo,
                doc_referencia: refTypeOption?.aux || prev.doc_referencia, 
                doc_referencia_numero: venta.documentoventaId || prev.doc_referencia_numero
            }));

            const mappedItems = mapVentaDetallesToGuiaItems(venta);
            if (mappedItems.length > 0) {
                const allowedItems = filterImportableItems(mappedItems);
                setItems(allowedItems);
            }

            setImportedReferenceDoc({ id: venta.documentoventaId, type: 'VENTA' });
            setShowDocModal(false);
            toast.success('Documento de venta importado');
        } catch (error: any) { toast.error('Error al importar documento'); } 
        finally { setIsSearchingDocs(false); }
    };

    const handleClearImportedReference = () => {
        if (!importedReferenceDoc) return;
        const serieActual = formData.serie || '';
        const tipoDocActual = formData.tipodoccomercialId || '';
        const correlativoActual = formData.correlativo || '';
        const modoManualActual = isManualCorrelativo;
        setDocRefComponents({ serie: '', numero: '' });
        setIsManualCorrelativo(modoManualActual);
        setItems([]);
        setImportedReferenceDoc(null);
        setForcedImportedClient(null);
        setFormData({
            ...initialFormData,
            tipodoccomercialId: tipoDocActual,
            serie: serieActual,
            correlativo: correlativoActual
        });
        setDocSearchFilters(initialDocSearchFilters);
        setDocSearchResults([]);
        setDocSearchPage(1);
        setDocSearchMeta({ currentPage: 1, totalPages: 1, totalRecords: 0 });
        setDocSearchHasSearched(false);
        setShowDocModal(false);
        toast.success('Importación limpiada.');
    };

    const handleProviderSearch = async (term: string) => {
        setProviderSearchTerm(term);
        try {
            const results = await catalogService.getDynamicCatalog('Proveedor', {
                tenantId: String(TENANT_ID),
                pageSize: 100,
                search: term || undefined
            });
            setProviderOptions(prev => {
                const selectedId = String(formData.proveedorId || '').trim();
                const selectedFromPrev = prev.find((x: any) => String(x.value || '').trim() === selectedId);
                const selectedFromCatalog = (proveedorCatalog || []).find((x: any) => String(x.value || '').trim() === selectedId);

                const next = mergeProviderOptions(
                    selectedFromPrev ? [selectedFromPrev] : [],
                    selectedFromCatalog ? [selectedFromCatalog] : [],
                    results as any[]
                );

                return sameProviderIds(prev, next) ? prev : next;
            });
        } catch {
            // Conservamos estado actual para no limpiar el DDL por un error puntual.
        }
    };

    const mergeTransportistaOptions = (...lists: any[][]) => {
        const seen = new Set<string>();
        const result: any[] = [];
        lists.flat().forEach((opt: any) => {
            const id = String(opt?.value || '').trim();
            if (!id || seen.has(id)) return;
            seen.add(id);
            result.push(opt);
        });
        return result;
    };

    const sameTransportistaIds = (a: any[], b: any[]) => {
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
            if (String(a[i]?.value || '').trim() !== String(b[i]?.value || '').trim()) return false;
        }
        return true;
    };

    useEffect(() => {
        if (transportistaSearchTerm.trim()) return;
        const catalogRows = transportistaCatalog as any[];
        setTransportistaOptions(prev => {
            const selectedId = String(formData.transportistaId || '').trim();
            const selectedFromPrev = prev.find((x: any) => String(x.value || '').trim() === selectedId);
            const selectedFromCatalog = catalogRows.find((x: any) => String(x.value || '').trim() === selectedId);

            const next = mergeTransportistaOptions(
                selectedFromPrev ? [selectedFromPrev] : [],
                selectedFromCatalog ? [selectedFromCatalog] : [],
                catalogRows
            );

            return sameTransportistaIds(prev, next) ? prev : next;
        });
    }, [transportistaCatalog, formData.transportistaId, transportistaSearchTerm]);

    const handleTransportistaSearch = async (term: string) => {
        setTransportistaSearchTerm(term);
        try {
            const results = await catalogService.getDynamicCatalog('Transportista', {
                empresaId: EMPRESA_ID,
                pageSize: 100,
                term: term || undefined
            });
            setTransportistaOptions(prev => {
                const selectedId = String(formData.transportistaId || '').trim();
                const selectedFromPrev = prev.find((x: any) => String(x.value || '').trim() === selectedId);
                const selectedFromCatalog = (transportistaCatalog || []).find((x: any) => String(x.value || '').trim() === selectedId);

                const next = mergeTransportistaOptions(
                    selectedFromPrev ? [selectedFromPrev] : [],
                    selectedFromCatalog ? [selectedFromCatalog] : [],
                    results as any[]
                );

                return sameTransportistaIds(prev, next) ? prev : next;
            });
        } catch {
            // Conservamos estado actual para no limpiar el DDL por un error puntual.
        }
    };

    const mergeUnidadTransporteOptions = (...lists: any[][]) => {
        const seen = new Set<string>();
        const result: any[] = [];
        lists.flat().forEach((opt: any) => {
            const id = String(opt?.value || '').trim();
            if (!id || seen.has(id)) return;
            seen.add(id);
            result.push(opt);
        });
        return result;
    };

    const sameUnidadTransporteIds = (a: any[], b: any[]) => {
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
            if (String(a[i]?.value || '').trim() !== String(b[i]?.value || '').trim()) return false;
        }
        return true;
    };

    useEffect(() => {
        if (unidadTransporteSearchTerm.trim()) return;
        const catalogRows = unidadTransporteCatalog as any[];
        setUnidadTransporteOptions(prev => {
            const selectedId = String(formData.unidadTransporteId || '').trim();
            const selectedFromPrev = prev.find((x: any) => String(x.value || '').trim() === selectedId);
            const selectedFromCatalog = catalogRows.find((x: any) => String(x.value || '').trim() === selectedId);

            const next = mergeUnidadTransporteOptions(
                selectedFromPrev ? [selectedFromPrev] : [],
                selectedFromCatalog ? [selectedFromCatalog] : [],
                catalogRows
            );
            return sameUnidadTransporteIds(prev, next) ? prev : next;
        });
    }, [unidadTransporteCatalog, formData.unidadTransporteId, unidadTransporteSearchTerm]);

    const handleUnidadTransporteSearch = async (term: string) => {
        setUnidadTransporteSearchTerm(term);
        try {
            const results = await catalogService.getDynamicCatalog('UnidadTransporte', {
                empresaId: EMPRESA_ID,
                pageSize: 100,
                term: term || undefined
            });
            setUnidadTransporteOptions(prev => {
                const selectedId = String(formData.unidadTransporteId || '').trim();
                const selectedFromPrev = prev.find((x: any) => String(x.value || '').trim() === selectedId);
                const selectedFromCatalog = (unidadTransporteCatalog || []).find((x: any) => String(x.value || '').trim() === selectedId);

                const next = mergeUnidadTransporteOptions(
                    selectedFromPrev ? [selectedFromPrev] : [],
                    selectedFromCatalog ? [selectedFromCatalog] : [],
                    results as any[]
                );
                return sameUnidadTransporteIds(prev, next) ? prev : next;
            });
        } catch {
            // Conservamos estado actual para no limpiar el DDL por un error puntual.
        }
    };

    const mergeConductorOptions = (...lists: any[][]) => {
        const seen = new Set<string>();
        const result: any[] = [];
        lists.flat().forEach((opt: any) => {
            const id = String(opt?.value || '').trim();
            if (!id || seen.has(id)) return;
            seen.add(id);
            result.push(opt);
        });
        return result;
    };

    const sameConductorIds = (a: any[], b: any[]) => {
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
            if (String(a[i]?.value || '').trim() !== String(b[i]?.value || '').trim()) return false;
        }
        return true;
    };

    useEffect(() => {
        if (conductorSearchTerm.trim()) return;
        const catalogRows = conductorCatalog as any[];
        setConductorOptions(prev => {
            const selectedId = String(formData.conductorId || '').trim();
            const selectedFromPrev = prev.find((x: any) => String(x.value || '').trim() === selectedId);
            const selectedFromCatalog = catalogRows.find((x: any) => String(x.value || '').trim() === selectedId);

            const next = mergeConductorOptions(
                selectedFromPrev ? [selectedFromPrev] : [],
                selectedFromCatalog ? [selectedFromCatalog] : [],
                catalogRows
            );
            return sameConductorIds(prev, next) ? prev : next;
        });
    }, [conductorCatalog, formData.conductorId, conductorSearchTerm]);

    const handleConductorSearch = async (term: string) => {
        setConductorSearchTerm(term);
        try {
            const results = await catalogService.getDynamicCatalog('ConductorTransporte', {
                empresaId: EMPRESA_ID,
                pageSize: 100,
                term: term || undefined
            });
            setConductorOptions(prev => {
                const selectedId = String(formData.conductorId || '').trim();
                const selectedFromPrev = prev.find((x: any) => String(x.value || '').trim() === selectedId);
                const selectedFromCatalog = (conductorCatalog || []).find((x: any) => String(x.value || '').trim() === selectedId);

                const next = mergeConductorOptions(
                    selectedFromPrev ? [selectedFromPrev] : [],
                    selectedFromCatalog ? [selectedFromCatalog] : [],
                    results as any[]
                );
                return sameConductorIds(prev, next) ? prev : next;
            });
        } catch {
            // Conservamos estado actual para no limpiar el DDL por un error puntual.
        }
    };

    const handleSubmit = async (enviarSunat: boolean) => {
        if (!formData.serie || !formData.correlativo) return toast.error("Falta Serie o Correlativo");
        if (!formData.motivotrasladoId) return toast.error("Seleccione un Motivo de Traslado");
        const hoy = format(new Date(), 'yyyy-MM-dd');
        const fechaTraslado = String(formData.fecha_traslado || '');
        if (fechaTraslado && fechaTraslado < hoy) {
            return toast.error("La fecha de traslado no puede ser menor al día actual.");
        }
        if (items.length === 0) return toast.error("Debe agregar al menos un ítem");
        const itemSinProductoIndex = items.findIndex((it: any) => !String(it?.bienId || '').trim());
        if (itemSinProductoIndex >= 0) {
            return toast.error(`Seleccione un producto en la fila ${itemSinProductoIndex + 1}.`);
        }
        if (items.some((it: any) => Number(it?.cantidad) <= 0)) {
            return toast.error("La cantidad de cada producto debe ser mayor a 0.");
        }
        
        if (currentRules.showCli && !formData.clienteId) return toast.error("Seleccione un Cliente");
        if (currentRules.showProv && !formData.proveedorId) return toast.error("Seleccione un Proveedor");
        if (currentRules.showDestAlmacen && !String(formData.id_almacen_destino || '').trim()) {
            return toast.error("Seleccione un Almacén Destino");
        }
        if (!String(formData.transportistaId || '').trim()) return toast.error("Seleccione una Empresa de Transporte");
        if (!String(formData.unidadTransporteId || '').trim()) return toast.error("Seleccione un Vehículo / Placa");
        if (!String(formData.conductorId || '').trim()) return toast.error("Seleccione un Conductor");

        const serieActual = String(formData.serie || '').trim().toUpperCase();
        const motivoActual = String(formData.motivotrasladoId || '').trim();
        const motivosConDocReferencia = new Set(['MT00003', 'MT00001', 'MT00002', 'MT00004', 'MT00013']);
        const debeExigirDocReferencia = (serieActual === 'T002' || shouldSendToSunat) && motivosConDocReferencia.has(motivoActual);
        if (debeExigirDocReferencia) {
            const hasTipoRef = !!(formData.documentoReferenciaTipo && String(formData.documentoReferenciaTipo).trim());
            const hasNumeroRef = !!(formData.documentoReferencia && String(formData.documentoReferencia).replace('-', '').trim());
            if (!hasTipoRef || !hasNumeroRef) {
                return toast.error("Para esta serie/motivo, complete el Documento Referencia.");
            }
        }

        setLoading(true);
        try {
            const payload: GuiaRemisionPayload = {
                ...formData as GuiaRemisionPayload,
                puntoventaId: '',
                trabajadorId: '',
                ...(requiresDocumentReference ? {} : { documentoReferencia: '', documentoReferenciaTipo: '', doc_referencia: '', doc_referencia_numero: '' }),
                detalles: items.map((item, idx) => {
                    const cantidadNum = Number(item.cantidad) || 0;
                    const selectedUM = item.unidades_opciones?.find((u: any) => u.key === item.unidad_aux);
                    const afectoInafectoBool = typeof (item as any).afecto_inafecto === 'boolean' ? (item as any).afecto_inafecto : (item as any).afecto_inafecto === 1 || (item as any).afecto_inafecto === 'true';

                    return {
                        bienId: item.bienId,
                        presentacionId: selectedUM?.presentacionId || null,
                        item: idx + 1, cantidad: cantidadNum, conversion_total: 100, precio: 100, costo: 100, importe: 100, Saldo_cantidad: cantidadNum,
                        descuento_producto: Number((item as any).descuento_producto ?? 0), afecto_inafecto: afectoInafectoBool,
                        observacion: (item as any).observacion ?? 'KG', documentoId: null, tabla_documento: 'GUIAS_REMISION', saldo_temporal: cantidadNum
                    };
                })
            };

            const response = enviarSunat ? await guiaRemisionService.createAndValidate(payload) : await guiaRemisionService.create(payload);
            if (response.isSuccess) {
                toast.success(enviarSunat ? "Guía enviada a SUNAT" : "Guía guardada exitosamente");
                router.push('/dashboard/guias-remision');
            } else {
                toast.error(response.message || "Error al procesar la guía");
            }
        } catch (error: any) { toast.error("Error crítico: " + error.message); } 
        finally { setLoading(false); }
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

    const handleOpenDocSearch = () => {
        if (importedReferenceDoc) return toast.warning("Limpie la importación actual primero.");
        setDocSearchFilters(prev => ({ ...prev, entidadId: currentRules.showProv ? (formData.proveedorId || '') : (formData.clienteId || '') }));
        setShowDocModal(true);
    };

    const fetchDocumentsPage = async (pageToLoad: number) => {
        if (!['COMPRA', 'VENTA'].includes(currentRules.refType || '')) return;
        setIsSearchingDocs(true);
        try {
            const filtersObj: any = {};
            if (docSearchFilters.tipoDocId) filtersObj.tipo_documento = [docSearchFilters.tipoDocId];
            if (docSearchFilters.monedaId) filtersObj.moneda = [docSearchFilters.monedaId];
            if (docSearchFilters.fechaIni) filtersObj.fecha_inicio = docSearchFilters.fechaIni;
            if (docSearchFilters.fechaFin) filtersObj.fecha_fin = docSearchFilters.fechaFin;

            let mappedResults = [];
            let resMeta = null;

            if (currentRules.refType === 'COMPRA') {
                if (docSearchFilters.entidadId) filtersObj.proveedor = [docSearchFilters.entidadId];
                const res = await documentoCompraService.getByEmpresa(EMPRESA_ID, pageToLoad, DOC_SEARCH_PAGE_SIZE, docSearchFilters.numero || "", filtersObj);
                if (res.isSuccess && res.data) {
                    const rows = Array.isArray(res.data) ? res.data : [];
                    resMeta = res.meta;
                    mappedResults = rows.map((doc: any) => ({
                        id: doc.documentocompraId, fecha: doc.fechaEmision ? format(parseISO(doc.fechaEmision), 'dd/MM/yyyy') : '',
                        nroDoc: `${doc.serie || ''} - ${doc.numero || ''}`.trim(), entidad: doc.proveedor?.descripcion || 'Sin Proveedor', moneda: doc.monedaId, raw: doc
                    }));
                }
            } else {
                if (docSearchFilters.entidadId) filtersObj.cliente = [docSearchFilters.entidadId];
                const res = await documentoVentaService.getByEmpresa(EMPRESA_ID, pageToLoad, DOC_SEARCH_PAGE_SIZE, docSearchFilters.numero || "", filtersObj);
                if (res?.data) {
                    const rows = Array.isArray(res.data) ? res.data : [];
                    resMeta = res.meta;
                    mappedResults = rows.map((doc: any) => ({
                        id: doc.documentoventaId, fecha: doc.fechaEmision ? format(parseISO(doc.fechaEmision), 'dd/MM/yyyy') : '',
                        nroDoc: `${doc.serie || ''} - ${doc.numero || ''}`.trim(), entidad: doc.cliente?.descripcion || doc.proveedor?.descripcion || 'Sin Entidad', moneda: doc.monedaId, raw: doc
                    }));
                }
            }
            
            setDocSearchResults(mappedResults);
            setDocSearchPage(pageToLoad);
            setDocSearchMeta({ currentPage: resMeta?.currentPage ?? pageToLoad, totalPages: resMeta?.totalPages ?? 1, totalRecords: resMeta?.totalRecords ?? mappedResults.length });
            if (pageToLoad === 1 && mappedResults.length === 0) toast.info("No se encontraron documentos.");
        } catch (error) { toast.error("Error al buscar documentos"); } 
        finally { setIsSearchingDocs(false); }
    };

    const handleSearchDocSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setDocSearchHasSearched(true);
        await fetchDocumentsPage(1);
    };

    const filteredDocSearchTypes = useMemo(() => {
        const tiposDisponibles = catalogs['TipoDocumentoComercial'] || [];
        const motivo = formData.motivotrasladoId;
        let filtroAux = "";
        if (motivo === 'MT00003') filtroAux = "DOCUMENTO_COMPRA"; 
        else if (['MT00001', 'MT00002', 'MT00004', 'MT00013'].includes(motivo || '')) filtroAux = "DOCUMENTO_VENTA";
        if (!filtroAux) return [];
        return tiposDisponibles.filter((t: any) => t.originalData?.tabla_referencia && t.originalData.tabla_referencia.toUpperCase() === filtroAux);
    }, [formData.motivotrasladoId, catalogs]);

    const entitySearchOptions = currentRules.showProv ? catalogs['Proveedor'] : catalogs['Cliente'];
    const entitySearchLabel = currentRules.showProv ? "Proveedor" : "Cliente";

    return (
        <div className="p-6 max-w-7xl mx-auto pb-20 animate-fade-in-up">
            
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
                <div className="flex gap-3 items-center">
                    {canSearchDocument && (
                        <div className="flex items-center gap-2">
                            <button 
                                type="button" 
                                onClick={handleOpenDocSearch}
                                disabled={!!importedReferenceDoc}
                                className="px-4 py-2.5 rounded-xl bg-indigo-50 text-indigo-700 font-bold hover:bg-indigo-100 shadow-sm border border-indigo-100 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <IconSearch size={18} /> Importar Doc.
                            </button>
                            {importedReferenceDoc && (
                                <button
                                    type="button"
                                    onClick={handleClearImportedReference}
                                    className="px-3 py-2.5 rounded-xl bg-rose-50 text-rose-700 font-bold hover:bg-rose-100 shadow-sm border border-rose-100 flex items-center justify-center transition-all active:scale-95"
                                    title="Limpiar importación"
                                >
                                    <IconX size={16} />
                                </button>
                            )}
                        </div>
                    )}
                    <button 
                        onClick={() => handleSubmit(shouldSendToSunat)} 
                        disabled={loading || loadingCatalogs}
                        className="px-6 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                    >
                        {shouldSendToSunat ? <IconSend size={20} /> : <IconDeviceFloppy size={20} />}
                        {shouldSendToSunat ? 'Enviar SUNAT' : 'Guardar'}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-12 gap-6">
                
                <div className="col-span-12 lg:col-span-8 space-y-6">
                    
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><IconBarcode size={120} /></div>

                        <SectionTitle title="Información General" icon={IconFileDescription} />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            
                            <div className="flex flex-col gap-1.5">
                                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Tipo Documento</label>
                                <select 
                                    name="tipodoccomercialId" 
                                    value={formData.tipodoccomercialId} 
                                    onChange={handleChange}
                                    disabled={loadingCatalogs}
                                    className="w-full border border-slate-200 p-2.5 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 bg-white font-bold text-slate-700"
                                >
                                    {docTypeOptions.length === 0 && <option value="">Cargando...</option>}
                                    {docTypeOptions.map((t: any) => (
                                        <option key={t.value} value={t.value}>{t.label}</option>
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
                                        disabled={filteredSeries.length === 0 || loadingCatalogs}
                                        className="w-full border border-slate-200 p-2.5 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:bg-slate-50"
                                    >
                                        {filteredSeries.length === 0 && <option value="">-</option>}
                                        {filteredSeries.map((s: any) => (
                                            <option key={s.value} value={s.value}>{s.label}</option>
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
                                        placeholder={isManualCorrelativo ? "Escriba..." : "Calculando..."}
                                        className={`w-full border p-2.5 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 transition-all font-mono tracking-wider ${isManualCorrelativo ? 'bg-white border-blue-300' : 'bg-slate-50 border-slate-200 text-slate-500'}`}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <FormInput label="Fecha Documento" type="date" name="fecha_doc" value={formData.fecha_doc} onChange={handleChange} />
                                <FormInput label="Fecha Traslado" type="date" name="fecha_traslado" value={formData.fecha_traslado} onChange={handleChange} min={formData.fecha_emision} />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <SectionTitle title="Datos del Traslado" icon={IconMapPin} />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            
                            <div className="md:col-span-2">
                                <SearchableSelect 
                                    label="Motivo de Traslado" name="motivotrasladoId"
                                    options={motivoTrasladoOptions}
                                    value={formData.motivotrasladoId || ''} onChange={handleChange}
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
                                        options={clienteOptions}
                                        value={formData.clienteId || ''} onChange={handleChange}
                                        onSearchChange={handleClienteSearch}
                                        disabled={formData.motivotrasladoId === 'MT00006'} 
                                    />
                                </div>
                            )}

                            {currentRules.showProv && (
                                <div className="md:col-span-2 animate-in fade-in slide-in-from-top-2">
                                    <SearchableSelect 
                                        label="Proveedor (Remitente/Origen)" name="proveedorId"
                                        options={providerOptions}
                                        value={formData.proveedorId || ''} onChange={handleChange}
                                        onSearchChange={handleProviderSearch}
                                    />
                                </div>
                            )}

                            <div className="space-y-3">
                                <SearchableSelect 
                                    label="Almacén Origen (Local)" name="id_almacen_inicio"
                                    options={catalogs['Almacen']}
                                    value={formData.id_almacen_inicio || ''} onChange={handleChange}
                                    disabled={formData.motivotrasladoId !== 'MT00006'} 
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
                                        options={catalogs['Almacen']?.filter((x:any) => String(x.value) !== String(formData.id_almacen_inicio))}
                                        value={formData.id_almacen_destino || ''} onChange={handleChange}
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

                    {requiresDocumentReference && (
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
                                        {documentoReferenciaTipoJSON.map((t: any) => (
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
                            
                            <input
                                type="hidden"
                                name="doc_referencia_numero"
                                value={formData.doc_referencia_numero || ''}
                                readOnly
                            />
                        </div>
                    </div>
                    )}

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
                                                        options={productOptions} 
                                                        value={item.bienId || ''} 
                                                        onChange={(e:any) => handleItemChange(idx, 'bienId', e.target.value)}
                                                        onSearchChange={handleProductSearch}
                                                        placeholder="Buscar producto por nombre o código..."
                                                    />
                                                </td>
                                                <td className="p-3">
                                                    <select 
                                                        className="w-full border border-slate-200 p-2 rounded outline-none focus:ring-1 focus:ring-blue-500 bg-white text-xs text-slate-700"
                                                        value={item.unidad_aux || ''} 
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
                                                        min="1"
                                                        step="1"
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

                <div className="col-span-12 lg:col-span-4 space-y-6">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 sticky top-4">
                        <SectionTitle title="Transporte" icon={IconTruck} />
                        <div className="space-y-4">
                            
                            <div className="flex gap-2 items-start min-w-0">
                                <div className="flex-1 min-w-0">
                                    <SearchableSelect 
                                        label="Empresa Transporte" name="transportistaId" 
                                        options={transportistaOptions}
                                        value={formData.transportistaId || ''} onChange={handleChange}
                                        onSearchChange={handleTransportistaSearch}
                                    />
                                </div>
                                <div className="flex gap-1 items-end pb-0.5 mt-5 shrink-0">
                                    <button type="button" onClick={() => handleOpenTransportista('ADD')} className="p-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors" title="Agregar Transportista">
                                        <IconPlus size={16} />
                                    </button>
                                    <button type="button" onClick={() => handleOpenTransportista('EDIT')} disabled={!formData.transportistaId} className="p-1.5 bg-orange-50 text-orange-600 rounded hover:bg-orange-100 disabled:opacity-30 transition-colors" title="Editar Transportista">
                                        <IconEdit size={16} />
                                    </button>
                                </div>
                            </div>
                            
                            <div className="flex gap-2 items-start min-w-0">
                                <div className="flex-1 min-w-0">
                                    <SearchableSelect 
                                        label="Vehículo / Placa" name="unidadTransporteId" 
                                        options={unidadTransporteOptions}
                                        value={formData.unidadTransporteId || ''} onChange={handleChange}
                                        onSearchChange={handleUnidadTransporteSearch}
                                    />
                                </div>
                                <div className="flex gap-1 items-end pb-0.5 mt-5 shrink-0">
                                    <button type="button" onClick={() => handleOpenUnidad('ADD')} className="p-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors" title="Agregar Vehículo">
                                        <IconPlus size={16} />
                                    </button>
                                    <button type="button" onClick={() => handleOpenUnidad('EDIT')} disabled={!formData.unidadTransporteId} className="p-1.5 bg-orange-50 text-orange-600 rounded hover:bg-orange-100 disabled:opacity-30 transition-colors" title="Editar Vehículo">
                                        <IconEdit size={16} />
                                    </button>
                                </div>
                            </div>

                            <div className="flex gap-2 items-start min-w-0">
                                <div className="flex-1 min-w-0">
                                    <SearchableSelect 
                                        label="Conductor" name="conductorId" 
                                        options={conductorOptions}
                                        value={formData.conductorId || ''} onChange={handleChange}
                                        onSearchChange={handleConductorSearch}
                                    />
                                </div>
                                <div className="flex gap-1 items-end pb-0.5 mt-5 shrink-0">
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
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">{entitySearchLabel}</label>
                            <SearchableSelect 
                                options={entitySearchOptions}
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
                                {catalogs['Moneda']?.map((m: any) => (
                                    <option key={m.value} value={m.value}>{m.label}</option>
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

            {showUnidadModal && (
                <UnidadFormModal 
                    isOpen={showUnidadModal} 
                    onClose={() => setShowUnidadModal(false)} 
                    onSuccess={() => { 
                        refreshCatalogs(); 
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
                        refreshCatalogs(); 
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
                        refreshCatalogs();
                        setShowTransportistaModal(false);
                    }}
                    transportistaToEdit={transportistaToEdit}
                />
            )}
        </div>
    );
}
