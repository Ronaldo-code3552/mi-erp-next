"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { format } from 'date-fns';

// Servicios y Tipos
import { guiaRemisionService } from '@/services/guiaRemisionService';
import { productoService } from '@/services/productoService'; // Necesario para buscar productos
import { GuiaRemisionPayload, GuiaRemisionDetalle } from '@/types/guiaRemision.types';

// UI Components
import SearchableSelect from '@/components/forms/SearchableSelect';
import { 
    IconDeviceFloppy, 
    IconSend, 
    IconPlus, 
    IconTrash, 
    IconArrowLeft,
    IconMapPin,
    IconTruck,
    IconPackage,
    IconFileDescription,
    IconFileInvoice
} from '@tabler/icons-react';



const SectionTitle = ({ title, icon: Icon }: any) => (
    <div className="flex items-center gap-2 text-slate-800 border-b border-slate-200 pb-2 mb-4 mt-6">
        <Icon className="text-blue-600" size={20} />
        <h3 className="font-bold text-sm uppercase tracking-wide">{title}</h3>
    </div>
);

const FormInput = ({ label, className, ...props }: any) => (
    <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">{label}</label>
        <input 
            className={`w-full border border-slate-200 p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400 transition-all ${className || ''}`}
            {...props}
        />
    </div>
);

// --- PÁGINA PRINCIPAL ---

export default function CrearGuiaPage() {
    const router = useRouter();
    const EMPRESA_ID = "005";
    const USER_ID = "CU0001"; // Debería venir de tu contexto de auth

    const [loading, setLoading] = useState(false);
    const [catalogs, setCatalogs] = useState<any>({});
    const [products, setProducts] = useState<any[]>([]); // Catálogo de productos para el detalle
    const [isManualCorrelativo, setIsManualCorrelativo] = useState(false);
    const [docRefParts, setDocRefComponents] = useState({ serie: '', numero: '' });

    // Estado del Formulario Principal
    const [formData, setFormData] = useState<Partial<GuiaRemisionPayload>>({
        empresaId: EMPRESA_ID,
        cuentausuarioId: USER_ID,
        tipodoccomercialId: 'X029', // Guía Remisión Remitente
        tipomovimientoId: 'S',      // Salida
        serie: 'T001',              // Serie por defecto (o lógica para obtenerla)
        correlativo: '',            
        fecha_emision: format(new Date(), 'yyyy-MM-dd'),
        fecha_traslado: format(new Date(), 'yyyy-MM-dd'),
        fecha_doc:format(new Date(), 'yyyy-MM-dd'),
        doc_referencia_numero:'',
        documentoReferencia: '',
        documentoReferenciaTipo: '',
        foto_guiaremision: '',
        monedaId: '001',            // Soles
        tipo_cambio: 1.0,
        estado: 'REGISTRADO',
        estado_documento_sunat: '0',
        incluye_igv: true,
        // Inicializar strings vacíos para evitar uncontrolled inputs
        clienteId: '',
        proveedorId: '', 
        puntoventaId: '', 
        trabajadorId: '', 
        id_almacen_inicio: '',
        id_almacen_destino: '',
        motivotrasladoId: '',
        transportistaId: '',
        conductorId: '',
        unidadTransporteId: '',
        punto_partida: '',
        punto_llegada: ''
    });

    // Estado para los Detalles (Items)
    const [items, setItems] = useState<GuiaRemisionDetalle[]>([]);

    // 1. Cargar Datos Iniciales (Catálogos y Productos)
    useEffect(() => {
        const loadData = async () => {
            try {
                // Cargar Dropdowns Gigantes
                const resCatalogs = await guiaRemisionService.getFormDropdowns(EMPRESA_ID);
                if (resCatalogs.isSuccess) setCatalogs(resCatalogs.data);

                // Cargar Productos (Para el buscador del detalle)
                // Nota: Pedimos pageSize alto para tener una lista base. 
                // Idealmente SearchableSelect debería tener búsqueda asíncrona server-side.
                const resProducts = await productoService.getByEmpresa(EMPRESA_ID, 1, 500); 
                if (resProducts.isSuccess) {
                    // Mapeamos para que SearchableSelect lo entienda
                    const mappedProds = resProducts.data.map((p: any) => ({
                        key: p.bienId,
                        value: p.descripcion,
                        aux: p.codigo_existencia // Usamos aux para mostrar código
                    }));
                    setProducts(mappedProds);
                }

            } catch (error) {
                toast.error("Error cargando datos iniciales");
            }
        };
        loadData();
    }, []);

    // --- HANDLERS CABECERA ---
    const handleChange = (e: any) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // --- HANDLERS DETALLE (ITEMS) ---
    const handleAddItem = () => {
        setItems([...items, {
            cantidad: 1,
            bienId: '',
            unidad_aux: 'NIU',
            descripcion_aux: '',
            peso_bruto: 0 // Si tuvieras peso
        } as any]);
    };

    const handleRemoveItem = (index: number) => {
        const newItems = [...items];
        newItems.splice(index, 1);
        setItems(newItems);
    };

    const handleItemChange = (index: number, field: keyof GuiaRemisionDetalle | string, value: any) => {
        const newItems = [...items];
        
        // Si cambiamos el producto, buscamos sus datos para autocompletar
        if (field === 'bienId') {
            const selectedProd = products.find(p => p.key === value);
            if (selectedProd) {
                newItems[index].descripcion_aux = selectedProd.value;
                // Aquí podrías setear la unidad de medida si viniera en el objeto producto
            }
        }

        (newItems[index] as any)[field] = value;
        setItems(newItems);
    };

    // --- GUARDAR ---
    const handleSubmit = async (enviarSunat: boolean) => {
        if (!formData.serie || !formData.clienteId || items.length === 0) {
            toast.error("Complete los datos obligatorios (Serie, Cliente y al menos 1 item)");
            return;
        }

        setLoading(true);
        try {
            // Construir payload final
            const payload: GuiaRemisionPayload = {
                ...formData as GuiaRemisionPayload,
                detalles: items.map((item, idx) => ({
                    ...item,
                    item: idx + 1, // Numeración automática
                    // Asegurar valores numéricos
                    cantidad: Number(item.cantidad),
                    peso_total: 0 // Si tuvieras lógica de peso
                }))
            };

            let response;
            if (enviarSunat) {
                response = await guiaRemisionService.createAndValidate(payload);
            } else {
                response = await guiaRemisionService.create(payload);
            }

            if (response.isSuccess) {
                toast.success(enviarSunat ? "Guía guardada y enviada a SUNAT" : "Guía guardada correctamente");
                if (enviarSunat && response.data?.respuestSunat) {
                    toast.info(`SUNAT: ${response.data.respuestSunat}`);
                }
                router.push('/dashboard/guias-remision'); // Volver al listado
            } else {
                toast.error(response.message || "Error al guardar");
            }

        } catch (error: any) {
            toast.error("Error crítico: " + error.message);
        } finally {
            setLoading(false);
        }
    };
    const handleDocRefChange = (field: 'serie' | 'numero', value: string) => {
        const newParts = { ...docRefParts, [field]: value };
        setDocRefComponents(newParts);
        
        // Lógica del legacy: ENTGUIA.documentoReferencia = TXTSERIEDOCREF.Text + " - " + TXTNUMDOCREF.Text;
        setFormData(prev => ({
            ...prev,
            documentoReferencia: `${newParts.serie} - ${newParts.numero}`
        }));
    };

    return (
        <div className="p-6 max-w-7xl mx-auto pb-20 animate-fade-in-up">
            
            {/* HEADER DE LA PÁGINA */}
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                    <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500">
                        <IconArrowLeft size={24} />
                    </button>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-800">Nueva Guía de Remisión</h1>
                        <p className="text-xs text-slate-500">Complete la información para generar el traslado</p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button 
                        onClick={() => handleSubmit(false)}
                        disabled={loading}
                        className="px-6 py-2.5 rounded-xl border border-slate-300 font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-all disabled:opacity-50"
                    >
                        <IconDeviceFloppy size={20} /> Guardar
                    </button>
                    <button 
                        onClick={() => handleSubmit(true)}
                        disabled={loading}
                        className="px-6 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                    >
                        <IconSend size={20} /> Guardar y Enviar a SUNAT
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-12 gap-6">
                
                {/* COLUMNA IZQUIERDA (Datos Principales) */}
                <div className="col-span-12 lg:col-span-8 space-y-6">
                    
                    {/* 1. DATOS GENERALES */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <SectionTitle title="Información General" icon={IconFileDescription} />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            
                            {/* === AQUI EMPIEZA EL CAMBIO (Serie y Correlativo Manual) === */}
                            <div className="grid grid-cols-2 gap-4">
                                {/* Input de Serie (Se mantiene igual) */}
                                <FormInput label="Serie" name="serie" value={formData.serie} onChange={handleChange} />
                                
                                {/* Lógica Personalizada de Correlativo (Reemplaza al FormInput anterior) */}
                                <div className="flex flex-col gap-1.5">
                                    <div className="flex justify-between items-center">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Correlativo</label>
                                        <div className="flex items-center gap-1">
                                            <input 
                                                type="checkbox" 
                                                id="chkManual" 
                                                checked={isManualCorrelativo} 
                                                onChange={(e) => {
                                                    setIsManualCorrelativo(e.target.checked);
                                                    if (!e.target.checked) {
                                                        // Si desmarca, limpia el valor para que sea automático
                                                        setFormData(prev => ({ ...prev, correlativo: '' }));
                                                    }
                                                }}
                                                className="w-3 h-3 accent-blue-600 cursor-pointer"
                                            />
                                            <label htmlFor="chkManual" className="text-[9px] font-bold text-blue-600 cursor-pointer uppercase select-none">
                                                # Manual
                                            </label>
                                        </div>
                                    </div>
                                    <input 
                                        name="correlativo"
                                        value={formData.correlativo || ''}
                                        onChange={(e) => {
                                            // Solo permite números y max 7 dígitos
                                            const val = e.target.value.replace(/\D/g, '').slice(0, 7);
                                            // Simulamos el evento para tu handleChange general
                                            handleChange({ target: { name: 'correlativo', value: val } });
                                        }}
                                        disabled={!isManualCorrelativo}
                                        placeholder={isManualCorrelativo ? "0000123" : "(Automático)"}
                                        className={`w-full border border-slate-200 p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 text-xs transition-all ${!isManualCorrelativo ? 'bg-slate-50 text-slate-400' : 'bg-white font-mono font-bold'}`}
                                    />
                                </div>
                            </div>


                            {/* El resto de tu código original se mantiene igual: Fechas */}
                            <div className="grid grid-cols-3 gap-4">
                                <FormInput label="Fecha Emisión" type="date" name="fecha_emision" value={formData.fecha_emision} onChange={handleChange} />
                                <FormInput label="Fecha Traslado" type="date" name="fecha_traslado" value={formData.fecha_traslado} onChange={handleChange} />
                                <FormInput label="Fecha dOCUMENTO" type="date" name="fecha_doc" value={formData.fecha_doc} onChange={handleChange} />
                            </div>

                            {/* Punto de Venta y Trabajador */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:col-span-2">
                                <SearchableSelect 
                                    label="Punto de Venta" 
                                    name="puntoventaId"
                                    options={catalogs.puntoVentaJson?.map((x: any) => ({ 
                                        key: x.key, 
                                        value: x.value || `COD: ${x.key}` 
                                    }))}
                                    value={formData.puntoventaId || ''} 
                                    onChange={handleChange}
                                />
                                <SearchableSelect 
                                    label="Trabajador / Responsable" 
                                    name="trabajadorId"
                                    options={catalogs.trabajadorJson?.map((x: any) => ({ 
                                        key: x.key, 
                                        value: x.value, 
                                        aux: x.aux 
                                    }))}
                                    value={formData.trabajadorId || ''} 
                                    onChange={handleChange}
                                />
                            </div>
                            
                            {/* Cliente y Proveedor */}
                            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <SearchableSelect 
                                    label="Cliente (Destinatario)" 
                                    name="clienteId"
                                    options={catalogs.clienteJson?.map((c: any) => ({ 
                                        key: c.key, 
                                        value: c.value || `COD: ${c.key}`, 
                                        aux: c.aux 
                                    }))} 
                                    value={formData.clienteId || ''} 
                                    onChange={handleChange}
                                />
                                <SearchableSelect 
                                    label="Proveedor (Remitente/Origen)" 
                                    name="proveedorId"
                                    options={catalogs.proveedorJson?.map((p: any) => ({ 
                                        key: p.key, 
                                        value: p.value, 
                                        aux: p.aux 
                                    }))}
                                    value={formData.proveedorId || ''} 
                                    onChange={handleChange}
                                    placeholder="Seleccionar si aplica"
                                />
                            </div>

                        </div>
                    </div>
                    {/* SECCIÓN NUEVA: DOCUMENTOS DE REFERENCIA */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <SectionTitle title="Documentos Relacionados" icon={IconFileInvoice} /> {/* Asegúrate de importar IconFileInvoice */}
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Parte 1: Documento Referencia (Factura asociada) */}
                            <div className="border border-slate-100 rounded-lg p-4 bg-slate-50/50">
                                <h4 className="text-xs font-bold text-slate-700 mb-3 border-b pb-1">COMPROBANTE ASOCIADO (Factura)</h4>
                                <div className="space-y-3">
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[10px] font-bold text-slate-500 uppercase">Tipo Documento</label>
                                        <select 
                                            name="documentoReferenciaTipo" 
                                            value={formData.documentoReferenciaTipo} 
                                            onChange={handleChange}
                                            className="w-full border border-slate-200 p-2.5 rounded-lg text-xs outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                        >
                                            <option value="00">-- SELECCIONE --</option>
                                            <option value="01">FACTURA</option>
                                            <option value="03">BOLETA DE VENTA</option>
                                        </select>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-3">
                                        <FormInput 
                                            label="Serie Ref." 
                                            placeholder="F001" 
                                            value={docRefParts.serie} 
                                            onChange={(e: any) => handleDocRefChange('serie', e.target.value)} 
                                        />
                                        <FormInput 
                                            label="Número Ref." 
                                            placeholder="000458" 
                                            value={docRefParts.numero} 
                                            onChange={(e: any) => handleDocRefChange('numero', e.target.value)} 
                                        />
                                    </div>
                                    <div className="text-[10px] text-slate-400 text-right italic">
                                        Ref. Final: {formData.documentoReferencia || '-'}
                                    </div>
                                </div>
                            </div>

                            {/* Parte 2: Otro Documento Referencia (Simple) */}
                            <div className="border border-slate-100 rounded-lg p-4 bg-slate-50/50">
                                <h4 className="text-xs font-bold text-slate-700 mb-3 border-b pb-1">OTRA REFERENCIA (Guía, Pedido)</h4>
                                <div className="space-y-3">
                                     <FormInput 
                                        label="Número Doc. Referencia" 
                                        name="doc_referencia_numero" 
                                        value={formData.doc_referencia_numero || ''} 
                                        onChange={handleChange} 
                                        placeholder="Ej: GR-12345"
                                    />
                                    {/* Aquí podrias poner observaciones extra si hace falta */}
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* 2. PUNTOS DE PARTIDA Y LLEGADA */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <SectionTitle title="Datos del Traslado" icon={IconMapPin} />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <SearchableSelect 
                                label="Motivo de Traslado" 
                                name="motivotrasladoId"
                                options={catalogs.motivoTasladoJson?.map((x: any) => ({ 
                                    key: x.key, 
                                    value: x.value || `COD: ${x.key}` // Fallback si no hay descripción
                                }))}
                                value={formData.motivotrasladoId || ''} 
                                onChange={handleChange}
                            />
                            {/* Si el motivo es 'Otros', mostrar input extra */}
                            {formData.motivotrasladoId === 'MT00013' && (
                                <FormInput label="Especificar otro motivo" name="otro_motivo_traslado" value={formData.otro_motivo_traslado} onChange={handleChange} />
                            )}
                            
                            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-3">
                                    <SearchableSelect 
                                        label="Almacén Origen" 
                                        name="id_almacen_inicio"
                                        options={catalogs.AlmacenInicioJson?.map((x: any) => ({ 
                                            key: x.key, 
                                            value: x.value || `COD: ${x.key}`,
                                            aux: x.aux 
                                        }))}
                                        value={formData.id_almacen_inicio || ''} 
                                        onChange={(e: any) => {
                                            // Auto-llenar dirección de partida si selecciona almacén
                                            const dir = catalogs.AlmacenInicioJson?.find((x: any) => x.key === e.target.value)?.aux;
                                            setFormData(prev => ({ ...prev, id_almacen_inicio: e.target.value, punto_partida: dir || '' }));
                                        }}
                                    />
                                    <FormInput 
                                        label="Dirección de Partida" 
                                        name="punto_partida" 
                                        value={formData.punto_partida} 
                                        onChange={handleChange} 
                                        className="text-xs"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <SearchableSelect 
                                        label="Almacén Destino" 
                                        name="id_almacen_destino"
                                        options={catalogs.AlmacenDestinoJson?.map((x: any) => ({ 
                                            key: x.key, 
                                            value: x.value || `COD: ${x.key}`,
                                            aux: x.aux 
                                        }))}
                                        value={formData.id_almacen_destino || ''} 
                                        onChange={(e: any) => {
                                            const dir = catalogs.AlmacenDestinoJson?.find((x: any) => x.key === e.target.value)?.aux;
                                            setFormData(prev => ({ ...prev, id_almacen_destino: e.target.value, punto_llegada: dir || '' }));
                                        }}
                                    />
                                    <FormInput 
                                        label="Dirección de Llegada" 
                                        name="punto_llegada" 
                                        value={formData.punto_llegada} 
                                        onChange={handleChange} 
                                        className="text-xs"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 3. DETALLE DE ITEMS */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                        <div className="flex justify-between items-center border-b border-slate-200 pb-2 mb-4 mt-2">
                            <div className="flex items-center gap-2 text-slate-800">
                                <IconPackage className="text-blue-600" size={20} />
                                <h3 className="font-bold text-sm uppercase tracking-wide">Bienes a Transportar</h3>
                            </div>
                            <button 
                                onClick={handleAddItem}
                                className="text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1 hover:bg-blue-100 transition-colors"
                            >
                                <IconPlus size={14} /> Agregar Item
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-50 text-slate-500 uppercase font-semibold">
                                    <tr>
                                        <th className="p-3 w-10">#</th>
                                        <th className="p-3 min-w-[250px]">Descripción Producto</th>
                                        <th className="p-3 w-24">U.M.</th>
                                        <th className="p-3 w-24">Cantidad</th>
                                        <th className="p-3 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {items.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="p-8 text-center text-slate-400 italic bg-slate-50/50 rounded-lg border border-dashed border-slate-200">
                                                No hay items agregados. Haga clic en "Agregar Item".
                                            </td>
                                        </tr>
                                    ) : (
                                        items.map((item, idx) => (
                                            <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="p-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                                                <td className="p-3">
                                                    <SearchableSelect 
                                                        name="bienId"
                                                        options={products}
                                                        value={item.bienId || ''}
                                                        onChange={(e: any) => handleItemChange(idx, 'bienId', e.target.value)}
                                                        placeholder="Buscar producto..."
                                                    />
                                                </td>
                                                <td className="p-3">
                                                    <input 
                                                        className="w-full bg-transparent border-b border-slate-200 outline-none text-center focus:border-blue-500"
                                                        value={item.unidad_aux || 'NIU'}
                                                        onChange={(e) => handleItemChange(idx, 'unidad_aux', e.target.value)}
                                                    />
                                                </td>
                                                <td className="p-3">
                                                    <input 
                                                        type="number"
                                                        className="w-full border border-slate-200 rounded p-1.5 text-right outline-none focus:ring-1 focus:ring-blue-500 font-mono"
                                                        value={item.cantidad}
                                                        onChange={(e) => handleItemChange(idx, 'cantidad', e.target.value)}
                                                    />
                                                </td>
                                                <td className="p-3 text-center">
                                                    <button onClick={() => handleRemoveItem(idx)} className="text-slate-400 hover:text-red-500 transition-colors">
                                                        <IconTrash size={16} />
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

                {/* COLUMNA DERECHA (Transporte y Resumen) */}
                <div className="col-span-12 lg:col-span-4 space-y-6">
                    
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 sticky top-4">
                        <SectionTitle title="Datos de Transporte" icon={IconTruck} />
                        
                        <div className="space-y-4">
                            <SearchableSelect 
                                label="Empresa Transporte" 
                                name="transportistaId"
                                options={catalogs.transportistaJson?.map((x: any) => ({ 
                                    key: x.key, 
                                    value: x.value || `COD: ${x.key}`, 
                                    aux: x.aux
                                 }))}
                                value={formData.transportistaId || ''} 
                                onChange={handleChange}
                            />
                            
                            <SearchableSelect 
                                label="Vehículo / Placa" 
                                name="unidadTransporteId"
                                options={catalogs.unidadTransporteJson?.map((x: any) => ({ 
                                    key: x.key, 
                                    value: x.value || `COD: ${x.key}` 
                                }))}
                                value={formData.unidadTransporteId || ''} 
                                onChange={handleChange}
                            />

                            <SearchableSelect 
                                label="Conductor" 
                                name="conductorId"
                                options={catalogs.conductorJson?.map((x: any) => ({ 
                                    key: x.key, 
                                    value: x.value || `COD: ${x.key}`, 
                                    aux: x.aux 
                                }))}
                                value={formData.conductorId || ''} 
                                onChange={handleChange}
                            />

                            <div className="pt-4 border-t border-slate-100">
                                <FormInput 
                                    label="Observaciones Generales" 
                                    name="observacion" 
                                    value={formData.observacion || ''} 
                                    onChange={handleChange} 
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-xs text-blue-800">
                        <p className="font-bold mb-1">Nota Importante:</p>
                        <p>Asegúrese de validar los datos del conductor y la placa del vehículo antes de enviar a SUNAT para evitar rechazos.</p>
                    </div>

                </div>

            </div>
        </div>
    );
}