// src/app/dashboard/guias-remision/editar/[id]/page.tsx
"use client";
import { useState, useEffect, useMemo, use } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';

// 1. IMPORTACIONES
import { guiaRemisionService } from '@/services/guiaRemisionService';
import { productoService } from '@/services/productoService';
import { presentacionService } from '@/services/presentacionService'; 
import { useCatalogs } from '@/hooks/useCatalogs'; 
import { GuiaRemisionPayload, GuiaRemisionDetalle } from '@/types/guiaRemision.types';

// UI Components
import SearchableSelect from '@/components/forms/SearchableSelect';
import { 
    IconArrowLeft, IconMapPin, IconTruck, IconPackage, 
    IconFileDescription, IconFileInvoice, IconBarcode, IconLoader
} from '@tabler/icons-react';

const SectionTitle = ({ title, icon: Icon }: any) => (
    <div className="flex items-center gap-2 text-slate-800 border-b border-slate-200 pb-2 mb-4 mt-6">
        <Icon className="text-blue-600" size={20} />
        <h3 className="font-bold text-sm uppercase tracking-wide">{title}</h3>
    </div>
);

// FormInput configurado para modo lectura
const FormInput = ({ label, className, disabled, value, ...props }: any) => (
    <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">{label}</label>
        <input 
            disabled={disabled}
            className={`w-full border p-2.5 rounded-lg outline-none transition-all text-xs 
                ${disabled ? 'bg-slate-50 text-slate-600 border-slate-200 cursor-not-allowed font-semibold' : 'border-slate-200 focus:ring-2 focus:ring-blue-500'} 
                ${className || ''}`}
            value={value !== undefined && value !== null ? value : ''} 
            {...props}
        />
    </div>
);

export default function DetalleGuiaPage({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const { id } = use(params); 

    const EMPRESA_ID = "005";
    const ALMACEN_ID = "001";
    const TENANT_ID = 1; 
    const ruc = "20100100100";

    const [loading, setLoading] = useState(true);
    const isReadOnly = true; // 🔒 MODO SOLO LECTURA

    const [products, setProducts] = useState<any[]>([]);
    const [formData, setFormData] = useState<Partial<GuiaRemisionPayload> & { 
        cliente_desc_fallback?: string, 
        proveedor_desc_fallback?: string,
        transp_desc_fallback?: string,
        cond_desc_fallback?: string,
        vehi_desc_fallback?: string
    }>({});
    const [items, setItems] = useState<GuiaRemisionDetalle[]>([]);
    const [docRefParts, setDocRefComponents] = useState({ serie: '', numero: '' });

    // 🚀 CARGA DE CATÁLOGOS CON MICROSERVICIOS
    const { catalogs, loadingCatalogs } = useCatalogs([
        'TipoDocumentoComercial',
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

    // =========================================================================
    // CARGA DE DATOS DE LA GUÍA (Aplicando Limpieza de Hierro)
    // =========================================================================
    useEffect(() => {
        const loadInitialData = async () => {
            setLoading(true);
            try {
                const [resProducts, resGuia] = await Promise.all([
                    productoService.getByEmpresa(EMPRESA_ID, 1, 500),
                    guiaRemisionService.getById(id)
                ]);
                
                let rawProducts: any[] = [];
                if (resProducts.isSuccess) {
                    rawProducts = resProducts.data || [];
                    setProducts(rawProducts);
                }

                if (resGuia.isSuccess && resGuia.data) {
                    const guia = resGuia.data;

                    // 🚀 LIMPIEZA PROFUNDA DE IDs
                    const formatId = (val: any) => {
                        const str = String(val || '').trim();
                        return str && !isNaN(Number(str)) ? str.padStart(5, '0') : str;
                    };

                    const cliIdLimpio = formatId(guia.clienteId);
                    const provIdLimpio = formatId(guia.proveedorId);
                    const motivIdLimpio = String(guia.motivotrasladoId || '').trim();
                    const tipoDocLimpio = String(guia.tipodoccomercialId || '').trim();

                    setFormData({
                        ...guia,
                        clienteId: cliIdLimpio,
                        proveedorId: provIdLimpio,
                        motivotrasladoId: motivIdLimpio,
                        id_almacen_inicio: String(guia.id_almacen_inicio || '').trim(),
                        id_almacen_destino: String(guia.id_almacen_destino || '').trim(),
                        transportistaId: String(guia.transportistaId || '').trim(),
                        conductorId: String(guia.conductorId || '').trim(),
                        unidadTransporteId: String(guia.unidadTransporteId || '').trim(),
                        tipodoccomercialId: tipoDocLimpio,
                        serie: String(guia.serie || '').trim(),
                        correlativo: String(guia.correlativo || '').trim(),
                        fecha_emision: guia.fecha_emision ? format(parseISO(guia.fecha_emision), 'yyyy-MM-dd') : '',
                        fecha_traslado: guia.fecha_traslado ? format(parseISO(guia.fecha_traslado), 'yyyy-MM-dd') : '',
                        fecha_doc: guia.fecha_doc ? format(parseISO(guia.fecha_doc), 'yyyy-MM-dd') : '',
                        
                        // Guardamos descripciones originales para el Fallback Inyector
                        cliente_desc_fallback: guia.cliente?.descripcion,
                        proveedor_desc_fallback: guia.proveedor?.descripcion,
                        transp_desc_fallback: guia.transportista?.descripcion,
                        cond_desc_fallback: guia.conductor ? `${guia.conductor.nombres} ${guia.conductor.apellidos}` : undefined,
                        vehi_desc_fallback: guia.unidadTransporte ? `${guia.unidadTransporte.descripcion} - ${guia.unidadTransporte.nro_matricula_cabina}` : undefined,
                    });

                    if (guia.documentoReferencia) {
                        const ref = String(guia.documentoReferencia || '').trim();
                        const [serieRef = '', numeroRef = ''] = ref.split(/\s*-\s*/, 2);
                        setDocRefComponents({ serie: serieRef.trim(), numero: numeroRef.trim() });
                    }

                    // 🚀 MAPEO DE ITEMS CON LIMPIEZA
                    if (guia.detalles && guia.detalles.length > 0) {
                        const mappedItems = await Promise.all(guia.detalles.map(async (det: any, idx: number) => {
                            const bienIdLimpio = String(det.bienId || '').trim();
                            const presentacionIdLimpia = String(det.presentacionId || '').trim();
                            const uAuxLimpio = String(det.unidad_aux || '').trim();

                            const resPres = await presentacionService.getByBien(bienIdLimpio);
                            let opcionesUM: any[] = [];
                            
                            if (resPres.isSuccess && resPres.data) {
                                opcionesUM = resPres.data.map((pres: any) => ({
                                    key: String(pres.unidadmedidaId || '').trim(),
                                    value: pres.descripcion || pres.unidadmedidaId,
                                    presentacionId: String(pres.presentacionId || '').trim()
                                }));
                            }

                            const prodDesc = det.bien?.descripcion || rawProducts.find((p:any) => String(p.bienId).trim() === bienIdLimpio)?.descripcion || `Producto ${bienIdLimpio}`;

                            return {
                                ...det,
                                item: idx + 1,
                                bienId: bienIdLimpio,
                                unidad_aux: presentacionIdLimpia 
                                    ? opcionesUM.find(o => o.presentacionId === presentacionIdLimpia)?.key || uAuxLimpio
                                    : uAuxLimpio,
                                descripcion_aux: prodDesc,
                                unidades_opciones: opcionesUM.length > 0 ? opcionesUM : [{ key: uAuxLimpio, value: uAuxLimpio }]
                            };
                        }));
                        setItems(mappedItems);
                    }
                } else {
                    toast.error("No se pudo cargar la guía");
                    router.push('/dashboard/guias-remision');
                }
            } catch (error) {
                toast.error("Error al cargar los datos de la guía");
            } finally {
                setLoading(false);
            }
        };

        loadInitialData();
    }, [id, router]);

    // =========================================================================
    // INYECTORES DE OPCIONES (Para evitar Selects en blanco en modo lectura)
    // =========================================================================
    
    const buildOptions = (catalogArray: any[], selectedValue: string, fallbackLabel?: string) => {
        const base = catalogArray || [];
        if (selectedValue && !base.some(x => String(x.value).trim() === selectedValue)) {
            return [...base, { key: selectedValue, value: selectedValue, label: fallbackLabel || `ID: ${selectedValue}` }];
        }
        return base;
    };

    const docTypeOptions = useMemo(() => {
        const opciones = catalogs['TipoDocumentoComercial']?.filter((t: any) => t.originalData?.tipodoccomercialId !== 'X030') || [];
        return buildOptions(opciones, formData.tipodoccomercialId || '', 'Documento');
    }, [catalogs, formData.tipodoccomercialId]);

    const documentoReferenciaTipoJSON = useMemo(() => {
        const base = catalogs['TipoDocumentoComercial']?.filter((t: any) => {
            const codSunat = t.originalData?.codtablaSunat;
            const tablaRef = String(t.originalData?.tabla_referencia || '').toLowerCase();
            return ['01', '03'].includes(codSunat) && tablaRef.includes('documento_venta');
        }).map((t: any) => ({
            key: t.value,
            value: String(t.originalData?.codtablaSunat || '').trim(),
            label: t.label || t.descripcion || t.aux || t.value,
            codSunat: t.originalData?.codtablaSunat,
            aux: t.originalData?.tabla_referencia
        })) || [];
        
        return buildOptions(base, formData.documentoReferenciaTipo || '', 'Tipo Referencia');
    }, [catalogs, formData.documentoReferenciaTipo]);

    const clienteOptions = useMemo(() => {
        let base = catalogs['Cliente'] || [];
        if (formData.motivotrasladoId === 'MT00006') {
            base = base.filter((c:any) => String(c.originalData?.num_docident || '').trim() === ruc);
        }
        return buildOptions(base, formData.clienteId || '', formData.cliente_desc_fallback);
    }, [catalogs, formData.motivotrasladoId, formData.clienteId, formData.cliente_desc_fallback]);

    const proveedorOptions = useMemo(() => buildOptions(catalogs['Proveedor'] || [], formData.proveedorId || '', formData.proveedor_desc_fallback), [catalogs, formData.proveedorId, formData.proveedor_desc_fallback]);
    
    const transportistaOptions = useMemo(() => buildOptions(catalogs['Transportista'] || [], formData.transportistaId || '', formData.transp_desc_fallback), [catalogs, formData.transportistaId, formData.transp_desc_fallback]);
    
    const unidadTransporteOptions = useMemo(() => buildOptions(catalogs['UnidadTransporte'] || [], formData.unidadTransporteId || '', formData.vehi_desc_fallback), [catalogs, formData.unidadTransporteId, formData.vehi_desc_fallback]);
    
    const conductorOptions = useMemo(() => buildOptions(catalogs['ConductorTransporte'] || [], formData.conductorId || '', formData.cond_desc_fallback), [catalogs, formData.conductorId, formData.cond_desc_fallback]);

    const productOptions = useMemo(() => {
        const base = products.map(p => ({
            key: String(p.bienId || '').trim(),
            value: String(p.bienId || '').trim(),
            label: String(p.descripcion || '').trim()
        }));

        const missing = items
            .filter(it => it.bienId && !base.some(b => b.value === it.bienId))
            .map(it => ({ key: it.bienId, value: it.bienId, label: it.descripcion_aux }));

        return [...base, ...missing];
    }, [products, items]);

    const handleNoOp = () => {};

    if (loading || loadingCatalogs) {
        return <div className="flex justify-center items-center h-screen"><span className="animate-spin text-blue-600 font-bold"><IconLoader size={40} /></span></div>;
    }

    return (
        <div className="p-6 max-w-7xl mx-auto pb-20 animate-fade-in-up opacity-95">
            
            {/* HEADER SIN BOTONES DE GUARDAR */}
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.back()} className="p-2 hover:bg-slate-200 rounded-full text-slate-600 transition-colors">
                        <IconArrowLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Detalle de Guía: {formData.serie}-{formData.correlativo}</h1>
                        <p className="text-xs text-slate-500">Modo de Solo Lectura</p>
                    </div>
                </div>
                <div className="px-4 py-2 bg-slate-100 border border-slate-200 rounded-lg font-bold text-slate-600">
                    ESTADO: {formData.estado}
                </div>
            </div>

            <div className="grid grid-cols-12 gap-6">
                <div className="col-span-12 lg:col-span-8 space-y-6">
                    
                    {/* 1. INFORMACIÓN GENERAL */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><IconBarcode size={120} /></div>

                        <SectionTitle title="Información General" icon={IconFileDescription} />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            
                            <SearchableSelect 
                                label="Tipo Documento" options={docTypeOptions} 
                                value={formData.tipodoccomercialId || ''} onChange={handleNoOp} disabled={isReadOnly} 
                            />

                            <div className="grid grid-cols-2 gap-4">
                                <FormInput label="Serie" value={formData.serie} disabled={isReadOnly} />
                                <FormInput label="Correlativo" value={formData.correlativo} disabled={isReadOnly} />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <FormInput label="Fecha Documento" type="date" value={formData.fecha_doc} disabled={isReadOnly} />
                                <FormInput label="Fecha Traslado" type="date" value={formData.fecha_traslado} disabled={isReadOnly} />
                            </div>
                        </div>
                    </div>

                    {/* 2. DATOS DEL TRASLADO */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <SectionTitle title="Datos del Traslado" icon={IconMapPin} />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="md:col-span-2">
                                <SearchableSelect 
                                    label="Motivo de Traslado" options={catalogs['MotivoTraslado']}
                                    value={formData.motivotrasladoId || ''} onChange={handleNoOp} disabled={isReadOnly}
                                />
                            </div>
                            
                            {formData.otro_motivo_traslado && (
                                <div className="md:col-span-2">
                                    <FormInput label="Especifique el Motivo" value={formData.otro_motivo_traslado} disabled={isReadOnly} />
                                </div>
                            )}

                            {formData.clienteId && (
                                <div className="md:col-span-2">
                                    <SearchableSelect 
                                        label="Cliente (Destinatario)" options={clienteOptions}
                                        value={formData.clienteId} onChange={handleNoOp} disabled={isReadOnly}
                                    />
                                </div>
                            )}

                            {formData.proveedorId && (
                                <div className="md:col-span-2">
                                    <SearchableSelect 
                                        label="Proveedor (Remitente/Origen)" options={proveedorOptions}
                                        value={formData.proveedorId} onChange={handleNoOp} disabled={isReadOnly}
                                    />
                                </div>
                            )}

                            <div className="space-y-3">
                                <SearchableSelect 
                                    label="Almacén Origen (Local)" options={catalogs['Almacen']}
                                    value={formData.id_almacen_inicio || ''} onChange={handleNoOp} disabled={isReadOnly} 
                                />
                                <FormInput label="Dirección de Partida" value={formData.punto_partida} disabled={isReadOnly} />
                            </div>

                            <div className="space-y-3">
                                {formData.id_almacen_destino ? (
                                    <SearchableSelect 
                                        label="Almacén Destino" options={catalogs['Almacen']}
                                        value={formData.id_almacen_destino || ''} onChange={handleNoOp} disabled={isReadOnly} 
                                    />
                                ) : (
                                    <div className="h-[62px] flex items-end pb-2">
                                        <span className="text-xs text-slate-400 italic">Destino Externo</span>
                                    </div>
                                )}
                                <FormInput label="Dirección de Llegada" value={formData.punto_llegada} disabled={isReadOnly} />
                            </div>
                        </div>
                    </div>

                    {/* 3. REFERENCIAS */}
                    {formData.documentoReferencia && (
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                            <SectionTitle title="Documento Referencia" icon={IconFileInvoice} />
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                                    <SearchableSelect 
                                        label="Tipo Documento" options={documentoReferenciaTipoJSON}
                                        value={formData.documentoReferenciaTipo || ''} onChange={handleNoOp} disabled={isReadOnly} 
                                    />
                                    <div className="grid grid-cols-2 gap-3">
                                        <FormInput label="Serie Ref." value={docRefParts.serie} disabled={isReadOnly} />
                                        <FormInput label="Número Ref." value={docRefParts.numero} disabled={isReadOnly} />
                                    </div>
                                </div>
                                
                                {/* Ocultamos visualmente el input como en crear, pero lo mantenemos en el DOM */}
                                <input
                                    type="hidden"
                                    name="doc_referencia_numero"
                                    value={formData.doc_referencia_numero || ''}
                                    readOnly
                                />
                            </div>
                        </div>
                    )}

                    {/* 4. ITEMS (SIN BOTONES DE AGREGAR O ELIMINAR) */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <SectionTitle title="Bienes a Transportar" icon={IconPackage} />
                        <div className="overflow-visible min-h-[200px]">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50 text-slate-500 uppercase font-semibold">
                                    <tr>
                                        <th className="p-3 w-10">#</th>
                                        <th className="p-3 w-[60%]">Descripción del Producto</th>
                                        <th className="p-3 w-32">U.M.</th>
                                        <th className="p-3 w-28 text-right">Cant.</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {items.map((item: any, idx) => (
                                        <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                            <td className="p-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                                            <td className="p-3">
                                                <SearchableSelect 
                                                    options={productOptions} value={item.bienId} onChange={handleNoOp} disabled={isReadOnly}
                                                />
                                            </td>
                                            <td className="p-3">
                                                <select className="w-full border border-slate-200 p-2 rounded bg-slate-50 text-slate-600 cursor-not-allowed" disabled>
                                                    {item.unidades_opciones?.map((u: any) => (
                                                        <option key={u.key} value={u.key}>{u.value}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="p-3">
                                                <FormInput type="number" className="text-right" value={item.cantidad} disabled={isReadOnly} />
                                            </td>
                                        </tr>
                                    ))}
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
                            <SearchableSelect 
                                label="Empresa Transporte" options={transportistaOptions} 
                                value={formData.transportistaId || ''} onChange={handleNoOp} disabled={isReadOnly} 
                            />
                            <SearchableSelect 
                                label="Vehículo / Placa" options={unidadTransporteOptions} 
                                value={formData.unidadTransporteId || ''} onChange={handleNoOp} disabled={isReadOnly} 
                            />
                            <SearchableSelect 
                                label="Conductor" options={conductorOptions} 
                                value={formData.conductorId || ''} onChange={handleNoOp} disabled={isReadOnly} 
                            />
                            <div className="pt-4 border-t border-slate-100">
                                <FormInput label="Observaciones Generales" value={formData.observacion} disabled={isReadOnly} />
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
