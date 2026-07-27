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
    IconDeviceFloppy,
    IconPhoto,
    IconPhotoOff
} from '@tabler/icons-react';
import { toast } from 'sonner';
import { SelectOption as CatalogOption } from '@/types/catalog.types';
import {
    Producto,
    ProductoCreateRequest,
    ProductoUpdateRequest
} from '@/types/producto.types';

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

const TabButton = ({ id, label, icon: Icon, activeTab, onClick }: { id: Tabs, label: string, icon: React.ComponentType<{ size?: number }>, activeTab: Tabs, onClick: (id: Tabs) => void }) => (
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

type FormInputProps = React.InputHTMLAttributes<HTMLInputElement> & {
    label: string;
    error?: string;
    helpText?: string;
};

const FormInput = ({ label, className, error, helpText, ...props }: FormInputProps) => (
    <div className="flex flex-col gap-1.5">
        <label className="text-[10px] font-black text-slate-500 uppercase ml-1">{label}</label>
        <input 
            aria-invalid={Boolean(error)}
            className={`w-full border p-2 rounded-lg focus:ring-2 outline-none transition-all disabled:bg-slate-50 disabled:text-slate-400 ${error ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : 'border-slate-200 focus:ring-blue-500'} ${className || ''}`}
            {...props}
        />
        {(error || helpText) && (
            <p className={`px-1 text-[10px] ${error ? 'font-semibold text-red-600' : 'text-slate-400'}`}>
                {error || helpText}
            </p>
        )}
    </div>
);

const nullableText = (value: unknown) => {
    const text = String(value ?? '').trim();
    return text || null;
};

const nullableNumber = (value: unknown) => {
    const text = String(value ?? '').trim();
    if (!text) return null;
    const number = Number(text);
    return Number.isFinite(number) ? number : null;
};

const hasMoreThanDecimals = (value: unknown, maxDecimals: number) => {
    const decimals = String(value ?? '').trim().split('.')[1];
    return Boolean(decimals && decimals.length > maxDecimals);
};

const isCodigoInternoError = (message: string) => {
    const normalized = message.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    return normalized.includes('codigo interno') || normalized.includes('codigo_existencia');
};

type FieldChangeEvent = {
    target: {
        name?: string;
        value: string | number;
        type?: string;
        checked?: boolean;
    };
};

export default function ProductFormModal({ isOpen, onClose, onSuccess, productToEdit }: Props) {
    const [activeTab, setActiveTab] = useState<Tabs>('general');
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<Partial<Producto>>({});
    const [imageError, setImageError] = useState(false);
    const [selectedClaseBienId, setSelectedClaseBienId] = useState('');
    const [codigoInternoError, setCodigoInternoError] = useState('');

    const isReadOnly = !!(productToEdit && productToEdit.estado === false);
    const isEditing = !!productToEdit; 

    // 🚀 MAGIA AQUÍ: Carga perezosa (Lazy Load) de catálogos solo si el modal está abierto
    const { catalogs, loadingCatalogs } = useCatalogs(isOpen ? [
        'TipoBien',
        {
            endpoint: 'ClaseBien',
            params: { filters: JSON.stringify({ estado: 1 }) }
        },
        'UnidadMedida',
        'DetraccionBien',
        'OperacionesItem',
        ...(selectedClaseBienId ? [{
            endpoint: 'SubClaseBien',
            params: {
                filters: JSON.stringify({
                    estado: 1,
                    clase_bien: [selectedClaseBienId]
                })
            }
        }] : [])
    ] : []);

    const normalizeId = (value: unknown): string => {
        if (value === null || value === undefined) return '';
        return String(value).trim();
    };

    useEffect(() => {
        if (isOpen) {
            // ELIMINADO: productoService.getFormDropdowns() 🧹
            
            if (productToEdit) {
                const claseBienId = normalizeId(
                    productToEdit.subclaseBien?.clasebienId ||
                    productToEdit.subClaseBien?.clasebienId ||
                    productToEdit.claseBien?.clasebienId
                );
                setFormData({
                    ...productToEdit,
                    descripcion: String(productToEdit.descripcion || '').toUpperCase(),
                    marca: String(productToEdit.marca || '').toUpperCase(),
                    tipobienId: productToEdit.tipobienId, 
                    subclasebienId: normalizeId(productToEdit.subclasebienId) || '', 
                    unidadmedidaId: normalizeId(productToEdit.unidadmedidaId) || '',
                    operacionesItemId: normalizeId(productToEdit.operacionesItemId || productToEdit.operacionesitemId) || '',
                    detraccionbienserviceId: normalizeId(productToEdit.detraccionbienserviceId || productToEdit.detraccionBienServiceId) || '000',
                    condicion_estado: productToEdit.condicion_estado || 'STOCK',
                    detraccion_porcentaje: productToEdit.detraccion_porcentaje || 0
                });
                setSelectedClaseBienId(claseBienId);
            } else {
                setFormData({ 
                    descripcion: '', codigo_existencia: '', codigo_barra: '', marca: '', 
                    codigo_osce: '', imagen: '', 
                    precio: undefined, costo: undefined,
                    detraccionbienserviceId: '000', 
                    detraccion_porcentaje: 0,
                    cuenta_contable: '', operacionesItemId: '',
                    tipobienId: 0, unidadmedidaId: '', subclasebienId: '', 
                    condicion_estado: 'STOCK', observacion: ''
                });
                setSelectedClaseBienId('');
            }
            setActiveTab('general');
            setImageError(false);
            setCodigoInternoError('');
        }
    }, [isOpen, productToEdit]);

    useEffect(() => {
        setImageError(false);
    }, [formData.imagen]);

    const handleInputChange = (e: FieldChangeEvent) => {
        if (isReadOnly) return;
        const { name, value, type, checked } = e.target;
        if (!name) return;

        if (name === 'detraccion_porcentaje') return;
        if (name === 'codigo_existencia') setCodigoInternoError('');

        if (name === 'precio' || name === 'costo' || name === 'detraccion_porcentaje') {
            if (value === '') {
                setFormData(prev => ({ ...prev, [name]: value }));
                return;
            }
            const numericValue = Number(value);
            if (Number.isFinite(numericValue) && numericValue < 0) return;

            const maxDecimals = name === 'detraccion_porcentaje' ? 2 : 4;
            if (hasMoreThanDecimals(value, maxDecimals)) return;
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
        const selectedOption = catalogs['DetraccionBien']?.find((opt: CatalogOption) =>
            String(opt.value) === String(selectedKey)
        );
        
        setFormData(prev => ({
            ...prev,
            detraccionbienserviceId: selectedKey,
            // 'aux' ahora trae la tasa configurada en catalogService
            detraccion_porcentaje: selectedOption && selectedOption.aux
                ? Math.round(parseFloat(selectedOption.aux) * 100) / 100
                : 0
        }));
    };

    const handleClaseBienChange = (value: string | number) => {
        if (isReadOnly) return;

        const claseBienId = normalizeId(value);
        setSelectedClaseBienId(claseBienId);
        setFormData(prev => ({ ...prev, subclasebienId: '' }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const descripcion = String(formData.descripcion || '').trim();
        const codigoInterno = String(formData.codigo_existencia || '').trim();

        setCodigoInternoError('');

        if (isEditing && !codigoInterno) {
            setActiveTab('general');
            setCodigoInternoError('El Código Interno es obligatorio.');
            return toast.error("El Código Interno es obligatorio.");
        }
        if (isEditing && codigoInterno.length > 100) {
            setActiveTab('general');
            setCodigoInternoError('El Código Interno admite como máximo 100 caracteres.');
            return toast.error("El Código Interno admite como máximo 100 caracteres.");
        }
        if (!descripcion) {
            setActiveTab('general');
            return toast.error("La descripción del producto es obligatoria.");
        }
        if (!String(formData.unidadmedidaId || '').trim()) {
            setActiveTab('clasificacion');
            return toast.error("Unidad de medida es obligatoria.");
        }

        const precioNum = nullableNumber(formData.precio);
        const costoNum = nullableNumber(formData.costo);
        const detraccionNum = nullableNumber(formData.detraccion_porcentaje) ?? 0;
        const parsedTipoBien = nullableNumber(formData.tipobienId);
        const tipobienNum = parsedTipoBien !== null && parsedTipoBien > 0 ? parsedTipoBien : null;
        if ((precioNum !== null && precioNum < 0) || (costoNum !== null && costoNum < 0) || detraccionNum < 0) {
            toast.error("Precio venta, costo compra y % detracción no pueden ser negativos.");
            return;
        }
        if (detraccionNum > 100) {
            setActiveTab('economico');
            return toast.error("% detracción debe estar entre 0 y 100.");
        }
        if (hasMoreThanDecimals(formData.precio, 4) || hasMoreThanDecimals(formData.costo, 4)) {
            setActiveTab('economico');
            return toast.error("Precio venta y costo compra admiten como máximo 4 decimales.");
        }
        if (hasMoreThanDecimals(formData.detraccion_porcentaje, 2)) {
            setActiveTab('economico');
            return toast.error("% detracción admite como máximo 2 decimales.");
        }

        setLoading(true);
        try {
            const commonPayload: ProductoCreateRequest = {
                empresaId: '005',
                descripcion: descripcion.toUpperCase(),
                marca: nullableText(formData.marca)?.toUpperCase() || null,
                tipobienId: tipobienNum,
                precio: precioNum,
                costo: costoNum,
                subclasebienId: nullableText(formData.subclasebienId),
                unidadmedidaId: String(formData.unidadmedidaId || '').trim(),
                codigo_barra: nullableText(formData.codigo_barra),
                afecto_inafecto: formData.afecto_inafecto ?? true,
                detraccion_porcentaje: detraccionNum,
                imagen: nullableText(formData.imagen),
                cuentausuarioId: 'CU0001',
                observacion: nullableText(formData.observacion),
                codigo_osce: nullableText(formData.codigo_osce),
                ubidst: nullableText(formData.ubidst),
                emite_ticket: formData.emite_ticket ?? false,
                condicion_estado: nullableText(formData.condicion_estado),
                operacionesItemId: nullableText(formData.operacionesItemId),
                detraccionbienserviceId: nullableText(formData.detraccionbienserviceId),
                cuenta_contable: nullableText(formData.cuenta_contable)
            };

            if (productToEdit) {
                const updatePayload: ProductoUpdateRequest = {
                    ...commonPayload,
                    codigo_existencia: codigoInterno,
                    cod_admin: productToEdit.cod_admin ?? null
                };
                const response = await productoService.update(productToEdit.bienId, updatePayload);
                if (!response.isSuccess) {
                    const message = response.message || "Error al actualizar el producto";
                    if (isCodigoInternoError(message)) {
                        setActiveTab('general');
                        setCodigoInternoError(message);
                    }
                    toast.error(message);
                    return;
                }

                setFormData(previous => ({ ...previous, ...response.data }));
                toast.success(`Producto actualizado. Código Interno: ${response.data.codigo_existencia}`);
            } else {
                const response = await productoService.create(commonPayload);
                if (!response.isSuccess) {
                    toast.error(response.message || "Error al crear el producto");
                    return;
                }

                setFormData(previous => ({ ...previous, ...response.data }));
                toast.success(`Producto creado. Código Interno: ${response.data.codigo_existencia}`);
            }

            onSuccess();
            onClose();
        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : "Error crítico en el servidor");
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
            <div className="flex border-b mb-4 -mx-6 px-6 bg-white sticky top-0 z-10 overflow-x-auto">
                <TabButton id="general" label="GENERALES" icon={IconInfoCircle} activeTab={activeTab} onClick={setActiveTab} />
                <TabButton id="economico" label="ECONÓMICO" icon={IconCurrencyDollar} activeTab={activeTab} onClick={setActiveTab} />
                <TabButton id="clasificacion" label="CLASIFICACIÓN" icon={IconTags} activeTab={activeTab} onClick={setActiveTab} />
                <TabButton id="otros" label="CONFIGURACIÓN" icon={IconSettings} activeTab={activeTab} onClick={setActiveTab} />
            </div>

            <form onSubmit={handleSubmit} className="h-[58vh] min-h-[470px] max-h-[600px] flex flex-col">
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-5 pb-5">
                {/* --- PESTAÑA GENERAL (Mismo código, no toca catálogos) --- */}
                {activeTab === 'general' && (
                    <div className="grid grid-cols-1 gap-5 animate-in fade-in slide-in-from-bottom-4 duration-300 lg:grid-cols-[minmax(0,1.35fr)_minmax(250px,0.65fr)]">
                        <div className="grid grid-cols-1 content-start gap-4 md:grid-cols-2">
                            <div className="md:col-span-2">
                                <FormInput label="Descripción del Producto *" name="descripcion" required disabled={isReadOnly} value={formData.descripcion || ''} onChange={handleInputChange} className="border-2 border-slate-100 p-2.5 rounded-xl uppercase font-semibold text-slate-700" />
                            </div>
                            <FormInput
                                label={isEditing ? "Código Interno *" : "Código Interno"}
                                name="codigo_existencia"
                                value={isEditing ? formData.codigo_existencia || '' : 'Se generará automáticamente'}
                                onChange={handleInputChange}
                                disabled={isReadOnly || !isEditing}
                                required={isEditing}
                                maxLength={100}
                                error={codigoInternoError}
                                helpText={isEditing
                                    ? "Debe ser único dentro de la empresa."
                                    : "El Código Interno será generado automáticamente al guardar el producto."}
                            />
                            <FormInput label="Código de Barras" name="codigo_barra" value={formData.codigo_barra || ''} onChange={handleInputChange} disabled={isReadOnly} />
                            <FormInput label="Marca" name="marca" value={formData.marca || ''} onChange={handleInputChange} disabled={isReadOnly} />
                            <FormInput label="Código OSCE" name="codigo_osce" value={formData.codigo_osce || ''} onChange={handleInputChange} disabled={isReadOnly} />
                            <div className="md:col-span-2">
                                <FormInput label="URL de la imagen" name="imagen" value={formData.imagen || ''} onChange={handleInputChange} disabled={isReadOnly} placeholder="https://servidor.com/producto.jpg" />
                                <p className="mt-1.5 px-1 text-[10px] text-slate-400">La vista previa se actualiza automáticamente al cambiar la ruta.</p>
                            </div>
                        </div>

                        <div className="min-h-[330px] overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                            <div className="flex items-center gap-2 border-b border-slate-200 bg-white px-3 py-2.5">
                                <IconPhoto size={16} className="text-blue-600" />
                                <span className="text-[10px] font-black uppercase text-slate-600">Vista previa</span>
                            </div>
                            <div className="flex h-[285px] items-center justify-center p-4">
                                {formData.imagen && !imageError ? (
                                    // Las URLs son configurables y pueden pertenecer a cualquier dominio externo.
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                        src={String(formData.imagen)}
                                        alt={String(formData.descripcion || 'Vista previa del producto')}
                                        className="h-full w-full object-contain"
                                        onError={() => setImageError(true)}
                                    />
                                ) : (
                                    <div className="flex max-w-[220px] flex-col items-center gap-3 text-center text-slate-400">
                                        <IconPhotoOff size={46} stroke={1.4} />
                                        <div>
                                            <p className="text-xs font-bold text-slate-500">{imageError ? 'No se pudo cargar la imagen' : 'Sin imagen'}</p>
                                            <p className="mt-1 text-[10px] leading-relaxed">{imageError ? 'Revise que la URL sea pública y válida.' : 'Ingrese una URL para visualizar el producto.'}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* --- PESTAÑA ECONÓMICA --- */}
                {activeTab === 'economico' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        {/* ... (Inputs de Precio y Costo intactos) ... */}
                        <div className={`p-3 border rounded-xl flex flex-col gap-2 ${isReadOnly ? 'bg-slate-100' : 'bg-emerald-50/40 border-emerald-100'}`}>
                            <label className="text-[10px] font-black text-emerald-700 uppercase">Precio Venta (S/)</label>
                            <input type="number" min="0" step="0.0001" name="precio" className="w-full bg-transparent text-xl font-black text-emerald-900 outline-none" value={formData.precio ?? ''} onChange={handleInputChange} disabled={isReadOnly} placeholder="0.0000" />
                        </div>
                        <div className={`p-3 border rounded-xl flex flex-col gap-2 ${isReadOnly ? 'bg-slate-100' : 'bg-rose-50/40 border-rose-100'}`}>
                            <label className="text-[10px] font-black text-rose-700 uppercase">Costo Compra (S/)</label>
                            <input type="number" min="0" step="0.0001" name="costo" className="w-full bg-transparent text-xl font-black text-rose-900 outline-none" value={formData.costo ?? ''} onChange={handleInputChange} disabled={isReadOnly} placeholder="0.0000" />
                        </div>
                        <div className="md:col-span-1">
                            <FormInput
                                label="% Detracción"
                                name="detraccion_porcentaje"
                                type="number"
                                min="0"
                                max="100"
                                step="0.01"
                                value={formData.detraccion_porcentaje}
                                onChange={handleInputChange}
                                disabled
                                title="Este porcentaje se calcula desde el Tipo de Detracción."
                            />
                        </div>
                        
                        <div className="md:col-span-2">
                             <SearchableSelect 
                                label="Tipo de Detracción (Catálogo 54)" 
                                name="detraccionbienserviceId" 
                                value={formData.detraccionbienserviceId || ''} 
                                onChange={(event) => handleDetraccionChange(String(event.target.value))}
                                // 🚀 Le pasamos el catálogo limpio sin mapeos extra
                                options={catalogs['DetraccionBien'] || []}
                                disabled={isReadOnly || loadingCatalogs}
                            />
                        </div>

                        <div className="md:col-span-2">
                            <SearchableSelect 
                                label="Tipo de Afectación (Operación)" 
                                name="operacionesItemId" 
                                value={formData.operacionesItemId || ''} 
                                onChange={handleInputChange} 
                                // 🚀 Le pasamos el catálogo limpio sin mapeos extra
                                options={catalogs['OperacionesItem'] || []}
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
                            options={catalogs['TipoBien'] || []}
                            onChange={handleInputChange}
                            disabled={isReadOnly || loadingCatalogs} 
                        />
                        
                        <SearchableSelect 
                            label="Unidad Medida" 
                            name="unidadmedidaId" 
                            value={formData.unidadmedidaId || ''} 
                            options={catalogs['UnidadMedida'] || []}
                            onChange={handleInputChange} 
                            disabled={isReadOnly || loadingCatalogs}
                        />

                        <div className="md:col-span-2">
                            <SearchableSelect
                                label="Clase de Bien"
                                name="clasebienId"
                                value={selectedClaseBienId}
                                options={catalogs['ClaseBien'] || []}
                                onChange={(event) => handleClaseBienChange(event.target.value)}
                                disabled={isReadOnly || loadingCatalogs}
                                placeholder="-- Seleccione una clase --"
                            />
                        </div>

                        <div className="md:col-span-2">
                            <SearchableSelect 
                                label="Subclase / Categoría" 
                                name="subclasebienId" 
                                value={formData.subclasebienId || ''} 
                                options={catalogs['SubClaseBien'] || []}
                                onChange={handleInputChange} 
                                disabled={isReadOnly || !selectedClaseBienId || loadingCatalogs}
                                placeholder={selectedClaseBienId ? "-- Seleccione una subclase --" : "Seleccione primero una clase"}
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
                                className="w-full border border-slate-200 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white transition-all disabled:bg-slate-50 disabled:text-slate-400"
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
                                className="w-full border border-slate-200 p-2 rounded-lg outline-none transition-all disabled:bg-slate-50 disabled:text-slate-400"
                                value={formData.observacion || ''} onChange={handleInputChange}
                            />
                        </div>
                    </div>
                )}
                </div>

                {/* --- FOOTER --- */}
                {!isReadOnly && (
                    <div className="border-t pt-3 mt-2 bg-white">
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
