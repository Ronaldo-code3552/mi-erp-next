// src/app/dashboard/productos/components/ProductFormModal.tsx
"use client";
import { useState, useEffect } from 'react';
import { productoService } from '@/services/productoService';
import { useCatalogs } from '@/hooks/useCatalogs'; // 🚀 NUEVO HOOK IMPORTADO
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

// Opciones estáticas (reemplazan al catálogo quemado en la BD)
const CONDICION_ESTADO_OPTIONS = [
    { key: 'STOCK', value: 'STOCK', label: 'STOCK' },
    { key: 'LIBRE', value: 'LIBRE', label: 'LIBRE' }
];

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    productToEdit?: Producto | null;
}

type Tabs = 'general' | 'economico' | 'clasificacion' | 'otros';

const TabButton = ({ id, label, icon: Icon, activeTab, onClick }: { id: Tabs, label: string, icon: any, activeTab: Tabs, onClick: (id: Tabs) => void }) => (
    <button
        type="button"
        onClick={() => onClick(id)}
        className={`flex items-center gap-2 px-4 py-3 text-[11px] font-black tracking-widest border-b-2 transition-all ${
            activeTab === id 
            ? 'border-blue-600 text-blue-600 bg-blue-50/50' 
            : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-50'
        }`}
    >
        <Icon size={16} /> {label}
    </button>
);

const FormInput = ({ label, className, ...props }: any) => (
    <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-black text-slate-500 uppercase ml-1">{label}</label>
        <input 
            className={`w-full border border-slate-200 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all disabled:bg-slate-50 disabled:text-slate-400 ${className || ''}`}
            {...props}
        />
    </div>
);

export default function ProductFormModal({ isOpen, onClose, onSuccess, productToEdit }: Props) {
    const [activeTab, setActiveTab] = useState<Tabs>('general');
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<Partial<Producto>>({});

    const isReadOnly = !!(productToEdit && productToEdit.estado === false);
    const isEditing = !!productToEdit; 

    // 🚀 MAGIA AQUÍ: Carga perezosa (Lazy Load) de catálogos solo si el modal está abierto
    const { catalogs, loadingCatalogs } = useCatalogs(isOpen ? [
        'TipoBien', 
        'SubClaseBien', 
        'UnidadMedida', 
        'DetraccionBien', 
        'OperacionesItem'
    ] : []);

    const normalizeId = (value: any): string => {
        if (value === null || value === undefined) return '';
        return String(value).trim();
    };

    useEffect(() => {
        if (isOpen) {
            // ELIMINADO: productoService.getFormDropdowns() 🧹
            
            if (productToEdit) {
                setFormData({
                    ...productToEdit,
                    descripcion: String(productToEdit.descripcion || '').toUpperCase(),
                    marca: String(productToEdit.marca || '').toUpperCase(),
                    tipobienId: productToEdit.tipobienId, 
                    subclasebienId: normalizeId(productToEdit.subclasebienId) || '', 
                    unidadmedidaId: normalizeId(productToEdit.unidadmedidaId) || '',
                    operacionesItemId: normalizeId(productToEdit.operacionesItemId) || '',
                    detraccionbienserviceId: normalizeId(productToEdit.detraccionbienserviceId) || '000',
                    condicion_estado: productToEdit.condicion_estado || 'STOCK',
                    detraccion_porcentaje: productToEdit.detraccion_porcentaje || 0
                });
            } else {
                setFormData({ 
                    descripcion: '', codigo_existencia: '', codigo_barra: '', marca: '', 
                    codigo_osce: '', imagen: '', 
                    precio: '' as any, costo: '' as any, 
                    detraccionbienserviceId: '000', 
                    detraccion_porcentaje: 0,
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

        if (name === 'precio' || name === 'costo' || name === 'detraccion_porcentaje') {
            if (value === '') {
                setFormData(prev => ({ ...prev, [name]: value }));
                return;
            }
            const numericValue = Number(value);
            if (Number.isFinite(numericValue) && numericValue < 0) return;
        }

        const normalizedValue =
            name === 'descripcion' || name === 'marca'
                ? String(value || '').toUpperCase()
                : value;

        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : normalizedValue
        }));
    };

    // 🚀 LÓGICA CORREGIDA: Usar el nuevo formato del catálogo de Detracciones
    const handleDetraccionChange = (selectedKey: string) => {
        if (isReadOnly) return;
        // Buscamos en el nuevo array de DetraccionBien
        const selectedOption = catalogs['DetraccionBien']?.find((opt: any) =>
            String(opt.value) === String(selectedKey) || String(opt.key) === String(selectedKey)
        );
        
        setFormData(prev => ({
            ...prev,
            detraccionbienserviceId: selectedKey,
            // 'aux' ahora trae la tasa configurada en catalogService
            detraccion_porcentaje: selectedOption && selectedOption.aux ? parseFloat(selectedOption.aux) : 0
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const descripcion = String(formData.descripcion || '').trim();
        if (!descripcion) {
            setActiveTab('general');
            return toast.error("La descripción del producto es obligatoria.");
        }
        const precioStr = String(formData.precio ?? '').trim();
        if (!precioStr) {
            setActiveTab('economico');
            return toast.error("Precio venta es obligatorio.");
        }
        const costoStr = String(formData.costo ?? '').trim();
        if (!costoStr) {
            setActiveTab('economico');
            return toast.error("Costo compra es obligatorio.");
        }
        const detraccionStr = String(formData.detraccion_porcentaje ?? '').trim();
        if (!detraccionStr) {
            setActiveTab('economico');
            return toast.error("% detracción es obligatorio.");
        }
        if (!String(formData.detraccionbienserviceId || '').trim()) {
            setActiveTab('economico');
            return toast.error("Tipo de detracción es obligatorio.");
        }
        if (!String(formData.operacionesItemId || '').trim()) {
            setActiveTab('economico');
            return toast.error("Tipo de afectación es obligatorio.");
        }
        const tipobienNum = Number(formData.tipobienId || 0);
        if (!Number.isFinite(tipobienNum) || tipobienNum <= 0) {
            setActiveTab('clasificacion');
            return toast.error("Tipo de bien es obligatorio.");
        }
        if (!String(formData.unidadmedidaId || '').trim()) {
            setActiveTab('clasificacion');
            return toast.error("Unidad de medida es obligatoria.");
        }
        if (!String(formData.subclasebienId || '').trim()) {
            setActiveTab('clasificacion');
            return toast.error("Subclase es obligatoria.");
        }
        if (!String(formData.condicion_estado || '').trim()) {
            setActiveTab('otros');
            return toast.error("Condición del stock es obligatoria.");
        }

        const precioNum = parseFloat(String(formData.precio || 0));
        const costoNum = parseFloat(String(formData.costo || 0));
        const detraccionNum = parseFloat(String(formData.detraccion_porcentaje || 0));
        if (precioNum < 0 || costoNum < 0 || detraccionNum < 0) {
            toast.error("Precio venta, costo compra y % detracción no pueden ser negativos.");
            return;
        }

        setLoading(true);
        try {
            const payload = {
                ...formData,
                descripcion: String(formData.descripcion || '').toUpperCase(),
                marca: String(formData.marca || '').toUpperCase(),
                empresaId: '005',
                cuentausuarioId: 'CU0001',
                afecto_inafecto: true,
                ubidst: '000000',
                emite_ticket: false,
                cod_admin: 100001,
                precio: precioNum,
                costo: costoNum,
                detraccion_porcentaje: detraccionNum
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

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={isReadOnly ? "Detalle de Producto (Bloqueado)" : productToEdit ? `Editando: ${productToEdit.descripcion}` : "Registrar Nuevo Producto"} 
            size="xl"
        >
            <div className="flex border-b mb-6 -mx-6 px-6 bg-white sticky top-0 z-10 overflow-x-auto">
                <TabButton id="general" label="GENERALES" icon={IconInfoCircle} activeTab={activeTab} onClick={setActiveTab} />
                <TabButton id="economico" label="ECONÓMICO" icon={IconCurrencyDollar} activeTab={activeTab} onClick={setActiveTab} />
                <TabButton id="clasificacion" label="CLASIFICACIÓN" icon={IconTags} activeTab={activeTab} onClick={setActiveTab} />
                <TabButton id="otros" label="CONFIGURACIÓN" icon={IconSettings} activeTab={activeTab} onClick={setActiveTab} />
            </div>

            <form onSubmit={handleSubmit} className="h-[68vh] flex flex-col">
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-6 pb-6">
                {/* --- PESTAÑA GENERAL (Mismo código, no toca catálogos) --- */}
                {activeTab === 'general' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        {/* ... Código de pestaña general intacto ... */}
                        <div className="md:col-span-2">
                            <FormInput label="Descripción del Producto *" name="descripcion" required disabled={isReadOnly} value={formData.descripcion || ''} onChange={handleInputChange} className="border-2 border-slate-100 p-3 rounded-xl uppercase font-semibold text-slate-700" />
                        </div>
                        <FormInput label="Código Interno" name="codigo_existencia" value={formData.codigo_existencia || ''} onChange={handleInputChange} disabled={isReadOnly} />
                        <FormInput label="Código de Barras" name="codigo_barra" value={formData.codigo_barra || ''} onChange={handleInputChange} disabled={isReadOnly} />
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
                        {/* ... (Inputs de Precio y Costo intactos) ... */}
                        <div className={`p-4 border rounded-xl flex flex-col gap-2 ${isReadOnly ? 'bg-slate-100' : 'bg-emerald-50/40 border-emerald-100'}`}>
                            <label className="text-[10px] font-black text-emerald-700 uppercase">Precio Venta (S/)</label>
                            <input type="number" min="0" step="0.01" name="precio" className="w-full bg-transparent text-2xl font-black text-emerald-900 outline-none" value={formData.precio} onChange={handleInputChange} disabled={isReadOnly} placeholder="0.00" />
                        </div>
                        <div className={`p-4 border rounded-xl flex flex-col gap-2 ${isReadOnly ? 'bg-slate-100' : 'bg-rose-50/40 border-rose-100'}`}>
                            <label className="text-[10px] font-black text-rose-700 uppercase">Costo Compra (S/)</label>
                            <input type="number" min="0" step="0.01" name="costo" className="w-full bg-transparent text-2xl font-black text-rose-900 outline-none" value={formData.costo} onChange={handleInputChange} disabled={isReadOnly} placeholder="0.00" />
                        </div>
                        <div className="md:col-span-1">
                            <FormInput label="% Detracción" name="detraccion_porcentaje" type="number" min="0" step="0.01" value={formData.detraccion_porcentaje} onChange={handleInputChange} disabled={isReadOnly} />
                        </div>
                        
                        <div className="md:col-span-2">
                             <SearchableSelect 
                                label="Tipo de Detracción (Catálogo 54)" 
                                name="detraccionbienserviceId" 
                                value={formData.detraccionbienserviceId || ''} 
                                onChange={(e:any) => handleDetraccionChange(e.target.value)} 
                                options={catalogs['DetraccionBien']?.map((opt: any) => ({
                                    key: opt.key || opt.value,
                                    value: opt.value,
                                    label: opt.label || opt.descripcion || String(opt.value),
                                    aux: opt.aux
                                })) || []}
                                disabled={isReadOnly || loadingCatalogs}
                            />
                        </div>

                        <div className="md:col-span-2">
                            <SearchableSelect 
                                label="Tipo de Afectación (Operación)" 
                                name="operacionesItemId" 
                                value={formData.operacionesItemId || ''} 
                                onChange={handleInputChange} 
                                options={catalogs['OperacionesItem']?.map((opt: any) => ({
                                    key: opt.key || opt.value,
                                    value: opt.value,
                                    label: opt.label || opt.descripcion || String(opt.value),
                                    aux: opt.aux
                                })) || []}
                                disabled={isReadOnly || loadingCatalogs} 
                            />
                        </div>
                    </div>
                )}

                {/* --- PESTAÑA CLASIFICACIÓN --- */}
                {activeTab === 'clasificacion' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <SearchableSelect 
                            label="Tipo de Bien" 
                            name="tipobienId" 
                            value={formData.tipobienId || ''} 
                            options={catalogs['TipoBien']?.map((opt: any) => ({
                                key: opt.key || opt.value,
                                value: opt.value,
                                label: opt.label || opt.descripcion || String(opt.value),
                                aux: opt.aux
                            })) || []}
                            onChange={handleInputChange}
                            disabled={isReadOnly || loadingCatalogs} 
                        />
                        
                        <SearchableSelect 
                            label="Unidad Medida" 
                            name="unidadmedidaId" 
                            value={formData.unidadmedidaId || ''} 
                            options={catalogs['UnidadMedida']?.map((opt: any) => ({
                                key: opt.key || opt.value,
                                value: opt.value,
                                label: opt.label || opt.descripcion || String(opt.value),
                                aux: opt.aux
                            })) || []}
                            onChange={handleInputChange} 
                            disabled={isReadOnly || isEditing || loadingCatalogs} 
                        />
                        
                        <div className="col-span-2">
                            <SearchableSelect 
                                label="Subclase / Categoría" 
                                name="subclasebienId" 
                                value={formData.subclasebienId || ''} 
                                options={catalogs['SubClaseBien']?.map((opt: any) => ({
                                    key: opt.key || opt.value,
                                    value: opt.value,
                                    label: opt.label || opt.descripcion || String(opt.value),
                                    aux: opt.aux
                                })) || []}
                                onChange={handleInputChange} 
                                disabled={isReadOnly || loadingCatalogs} 
                            />
                        </div>
                    </div>
                )}

                {/* --- PESTAÑA OTROS --- */}
                {activeTab === 'otros' && (
                    <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Condición del Stock</label>
                            <select 
                                name="condicion_estado" 
                                value={formData.condicion_estado || 'STOCK'} 
                                onChange={handleInputChange} 
                                disabled={isReadOnly}
                                className="w-full border border-slate-200 p-2.5 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white transition-all disabled:bg-slate-50 disabled:text-slate-400"
                            >
                                {/* 🚀 Usamos el Array estático */}
                                {CONDICION_ESTADO_OPTIONS.map((opt) => (
                                    <option key={opt.key} value={opt.value}>{opt.label}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Observaciones</label>
                            <textarea 
                                name="observacion" rows={3} disabled={isReadOnly}
                                className="w-full border border-slate-200 p-2.5 rounded-lg outline-none transition-all disabled:bg-slate-50 disabled:text-slate-400"
                                value={formData.observacion || ''} onChange={handleInputChange}
                            />
                        </div>
                    </div>
                )}
                </div>

                {/* --- FOOTER --- */}
                {!isReadOnly && (
                    <div className="border-t pt-4 mt-2 bg-white">
                        <div className="flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-6 py-2.5 text-xs font-black text-slate-400 hover:text-slate-600 transition-colors uppercase tracking-widest">
                            Cancelar
                        </button>
                        <button type="submit" disabled={loading || loadingCatalogs} className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-3 rounded-xl font-black text-xs tracking-widest flex items-center gap-2 shadow-lg shadow-blue-200 transition-all active:scale-95 disabled:opacity-50">
                            {loading ? <IconLoader className="animate-spin" size={18}/> : <IconDeviceFloppy size={18}/>}
                            {productToEdit ? "GUARDAR CAMBIOS" : "REGISTRAR PRODUCTO"}
                        </button>
                        </div>
                    </div>
                )}
            </form>
        </Modal>
    );
}
