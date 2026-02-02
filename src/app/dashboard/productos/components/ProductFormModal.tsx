// src/app/dashboard/productos/components/ProductFormModal.tsx
"use client";
import { useState, useEffect } from 'react';
import { productoService } from '@/services/productoService';
import Modal from '@/components/ui/Modal';
import SearchableSelect from '@/components/forms/SearchableSelect';
import { 
    IconInfoCircle, 
    IconCurrencyDollar, 
    IconTags, 
    IconSettings, 
    IconLoader, 
    IconDeviceFloppy 
} from '@tabler/icons-react';
import { toast } from 'sonner';
import { Producto } from '@/types/producto.types';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    productToEdit?: Producto | null;
}

type Tabs = 'general' | 'economico' | 'clasificacion' | 'otros';

export default function ProductFormModal({ isOpen, onClose, onSuccess, productToEdit }: Props) {
    const [activeTab, setActiveTab] = useState<Tabs>('general');
    const [loading, setLoading] = useState(false);
    const [catalogs, setCatalogs] = useState<any>(null);
    
    // Usamos Partial<Producto> para que coincida con los tipos corregidos
    const [formData, setFormData] = useState<Partial<Producto>>({});

    const isReadOnly = !!(productToEdit && productToEdit.estado === false);

    useEffect(() => {
        if (isOpen) {
            productoService.getFormDropdowns().then(res => {
                if (res.isSuccess) setCatalogs(res.data);
            });
            
            // Cargar datos o inicializar
            if (productToEdit) {
                setFormData({
                    ...productToEdit,
                    // CORRECCIÓN: Mapeo directo usando los nombres reales de la BD/Interfaz
                    tipobienId: productToEdit.tipobienId, 
                    subclasebienId: productToEdit.subclasebienId || '', 
                    unidadmedidaId: productToEdit.unidadmedidaId || '',
                    condicion_estado: productToEdit.condicion_estado || 'STOCK',
                    // Mapeos de nombres diferentes si fuera necesario (pero ya arreglamos la interfaz)
                    detraccion_porcentaje: productToEdit.detraccion_porcentaje || 0
                });
            } else {
                // Valores iniciales para Crear Nuevo
                setFormData({ 
                    descripcion: '', codigo_existencia: '', codigo_barra: '', marca: '', 
                    codigo_osce: '', imagen: '', 
                    precio: 0, costo: 0, 
                    detraccionbienserviceId: '000', detraccion_porcentaje: 0,
                    cuenta_contable: '', operacionesItemId: '',
                    tipobienId: 0, unidadmedidaId: '', subclasebienId: '', 
                    condicion_estado: 'STOCK', observacion: '',
                    estado: true
                });
            }
            setActiveTab('general');
        }
    }, [isOpen, productToEdit]);

    const handleInputChange = (e: any) => {
        if (isReadOnly) return;
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleDetraccionChange = (selectedKey: string) => {
        if (isReadOnly) return;
        const selectedOption = catalogs?.detraccion_bien_service?.find((opt: any) => opt.key === selectedKey);
        
        setFormData(prev => ({
            ...prev,
            detraccionbienserviceId: selectedKey,
            // CORRECCIÓN: Usar el nombre correcto de la propiedad
            detraccion_porcentaje: selectedOption ? parseFloat(selectedOption.aux) : 0
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            // Preparamos el payload (objeto a enviar al backend)
            const payload = {
                ...formData,
                empresaId: '005', // Hardcodeado según tu lógica actual
                cuentausuarioId: 'CU0001',
                afecto_inafecto: true, // Asumimos true por defecto o deberías agregar un checkbox en el form
                ubidst: '000000',
                emite_ticket: false,
                cod_admin: 100001, // Ojo: En tu JSON es número, aquí lo mandas como número
                
                // Conversiones de seguridad para asegurar tipos numéricos
                precio: parseFloat(String(formData.precio || 0)),
                costo: parseFloat(String(formData.costo || 0)),
                detraccion_porcentaje: parseFloat(String(formData.detraccion_porcentaje || 0))
            };

            const res = productToEdit 
                ? await productoService.update(productToEdit.bienId, payload)
                : await productoService.create(payload);
            
            if (res.isSuccess) {
                toast.success(productToEdit ? "Producto actualizado correctamente" : "Producto creado con éxito");
                onSuccess();
                onClose();
            } else {
                toast.error(res.message || "Error al procesar la solicitud");
            }
        } catch (error) {
            console.error(error);
            toast.error("Error crítico en el servidor");
        } finally {
            setLoading(false);
        }
    };

    // ... (TabButton y FormInput se mantienen igual) ...
    const TabButton = ({ id, label, icon: Icon }: { id: Tabs, label: string, icon: any }) => (
        <button
            type="button"
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-2 px-4 py-3 text-[11px] font-black tracking-widest border-b-2 transition-all ${
                activeTab === id 
                ? 'border-blue-600 text-blue-600 bg-blue-50/50' 
                : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50'
            }`}
        >
            <Icon size={16} /> {label}
        </button>
    );

    const FormInput = ({ label, ...props }: any) => (
        <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase ml-1">{label}</label>
            <input 
                className={`w-full border border-slate-200 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all disabled:bg-slate-50 disabled:text-slate-400 ${props.className || ''}`}
                {...props}
            />
        </div>
    );

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={isReadOnly ? "Detalle de Producto (Bloqueado)" : productToEdit ? `Editando: ${productToEdit.descripcion}` : "Registrar Nuevo Producto"} 
            size="lg"
        >
            <div className="flex border-b mb-6 -mx-6 px-6 bg-white sticky top-0 z-10 overflow-x-auto">
                <TabButton id="general" label="GENERALES" icon={IconInfoCircle} />
                <TabButton id="economico" label="ECONÓMICO" icon={IconCurrencyDollar} />
                <TabButton id="clasificacion" label="CLASIFICACIÓN" icon={IconTags} />
                <TabButton id="otros" label="CONFIGURACIÓN" icon={IconSettings} />
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                
                {/* --- PESTAÑA GENERAL --- */}
                {activeTab === 'general' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className="md:col-span-2">
                            <FormInput 
                                label="Descripción del Producto *" 
                                name="descripcion" 
                                required 
                                disabled={isReadOnly}
                                value={formData.descripcion || ''} 
                                onChange={handleInputChange}
                                className="border-2 border-slate-100 p-3 rounded-xl uppercase font-semibold text-slate-700"
                            />
                        </div>

                        <FormInput label="Código Interno" name="codigo_existencia" value={formData.codigo_existencia || ''} onChange={handleInputChange} disabled={isReadOnly} />
                        <FormInput label="Código de Barras" name="codigo_barra" value={formData.codigo_barra || ''} onChange={handleInputChange} disabled={isReadOnly} />
                        
                        {/* NOTA IMPORTANTE SOBRE MARCA: 
                           En tu BD 'marca' es un VARCHAR, no un ID. 
                           Si 'catalogs.marcas' devuelve IDs, el backend debe esperar un ID.
                           Si el backend espera texto, aquí deberías enviar el texto seleccionado.
                           Asumiré que es Texto Input libre o un Select que devuelve Texto.
                        */}
                        <div className="md:col-span-1">
                             <FormInput label="Marca" name="marca" value={formData.marca || ''} onChange={handleInputChange} disabled={isReadOnly} />
                        </div>

                        <FormInput label="Código OSCE" name="codigo_osce" value={formData.codigo_osce || ''} onChange={handleInputChange} disabled={isReadOnly} />

                        <div className="md:col-span-2">
                            <FormInput label="URL Imagen" name="imagen" value={formData.imagen || ''} onChange={handleInputChange} disabled={isReadOnly} placeholder="https://..." />
                        </div>
                    </div>
                )}

                {/* --- PESTAÑA ECONÓMICA --- */}
                {activeTab === 'economico' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className={`p-4 border rounded-xl flex flex-col gap-2 ${isReadOnly ? 'bg-slate-100' : 'bg-emerald-50/40 border-emerald-100'}`}>
                            <label className="text-[10px] font-black text-emerald-700 uppercase">Precio Venta (S/)</label>
                            <input type="number" step="0.01" name="precio" className="w-full bg-transparent text-2xl font-black text-emerald-900 outline-none" value={formData.precio || 0} onChange={handleInputChange} disabled={isReadOnly} />
                        </div>

                        <div className={`p-4 border rounded-xl flex flex-col gap-2 ${isReadOnly ? 'bg-slate-100' : 'bg-rose-50/40 border-rose-100'}`}>
                            <label className="text-[10px] font-black text-rose-700 uppercase">Costo Compra (S/)</label>
                            <input type="number" step="0.01" name="costo" className="w-full bg-transparent text-2xl font-black text-rose-900 outline-none" value={formData.costo || 0} onChange={handleInputChange} disabled={isReadOnly} />
                        </div>

                        <div className="md:col-span-1">
                            {/* CORREGIDO: name="detraccion_porcentaje" */}
                            <FormInput label="% Detracción" name="detraccion_porcentaje" type="number" value={formData.detraccion_porcentaje || 0} onChange={handleInputChange} disabled={isReadOnly} />
                        </div>
                        
                        <div className="md:col-span-2">
                             <SearchableSelect 
                                label="Tipo de Detracción (Catálogo 54)" 
                                name="detraccionbienserviceId" 
                                value={formData.detraccionbienserviceId || ''} 
                                onChange={(e:any) => handleDetraccionChange(e.target.value)} 
                                options={catalogs?.detraccion_bien_service} 
                                disabled={isReadOnly}
                            />
                        </div>

                        <div className="md:col-span-2">
                            <SearchableSelect 
                                label="Tipo de Afectación (Operación)" 
                                name="operacionesItemId" 
                                value={formData.operacionesItemId || ''} 
                                onChange={handleInputChange} 
                                options={catalogs?.operaciones_item} 
                                disabled={isReadOnly} 
                            />
                        </div>
                    </div>
                )}

                {/* --- PESTAÑA CLASIFICACIÓN --- */}
                {activeTab === 'clasificacion' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        {/* CORREGIDO: name="tipobienId" */}
                        <SearchableSelect label="Tipo de Bien" name="tipobienId" value={formData.tipobienId || ''} options={catalogs?.tipo_bien} onChange={handleInputChange} disabled={isReadOnly} />
                        
                        {/* CORREGIDO: name="unidadmedidaId" */}
                        <SearchableSelect label="Unidad Medida" name="unidadmedidaId" value={formData.unidadmedidaId || ''} options={catalogs?.unidad_medida} onChange={handleInputChange} disabled={isReadOnly} />
                        
                        <div className="col-span-2">
                            {/* CORREGIDO: name="subclasebienId" */}
                            <SearchableSelect label="Subclase / Categoría" name="subclasebienId" value={formData.subclasebienId || ''} options={catalogs?.sub_clase_bien} onChange={handleInputChange} disabled={isReadOnly} />
                        </div>
                    </div>
                )}

                {/* --- PESTAÑA OTROS (Se mantiene igual, solo verifica que condicion_estado exista en Producto) --- */}
                {activeTab === 'otros' && (
                    <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Condición del Stock</label>
                            <select 
                                name="condicion_estado" 
                                value={formData.condicion_estado || 'STOCK'} 
                                onChange={handleInputChange} 
                                disabled={isReadOnly}
                                className="w-full border border-slate-200 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white"
                            >
                                {catalogs?.condicion_estado?.map((opt: any) => (
                                    <option key={opt.key} value={opt.key}>{opt.value}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Observaciones</label>
                            <textarea 
                                name="observacion" rows={3} disabled={isReadOnly}
                                className="w-full border border-slate-200 p-2.5 rounded-lg outline-none"
                                value={formData.observacion || ''} onChange={handleInputChange}
                            />
                        </div>
                    </div>
                )}

                {/* --- FOOTER --- */}
                {!isReadOnly && (
                    <div className="flex justify-end gap-3 pt-6 border-t mt-4">
                        <button type="button" onClick={onClose} className="px-6 py-2.5 text-xs font-black text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-widest">
                            Cancelar
                        </button>
                        <button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-3 rounded-xl font-black text-xs tracking-widest flex items-center gap-2 shadow-lg shadow-blue-200 transition-all active:scale-95 disabled:opacity-50">
                            {loading ? <IconLoader className="animate-spin" size={18}/> : <IconDeviceFloppy size={18}/>}
                            {productToEdit ? "GUARDAR CAMBIOS" : "REGISTRAR PRODUCTO"}
                        </button>
                    </div>
                )}
            </form>
        </Modal>
    );
}