// src/app/dashboard/tabla-transacciones/components/TransaccionFormModal.tsx
"use client";
import { useState, useEffect } from 'react';
import { tablaTransaccionesService } from '@/services/tablaTransaccionesService';
import { useCatalogs } from '@/hooks/useCatalogs'; // 🚀 Importar useCatalogs
import Modal from '@/components/ui/Modal';
import SearchableSelect from '@/components/forms/SearchableSelect';
import { IconDeviceFloppy, IconLoader } from '@tabler/icons-react';
import { toast } from 'sonner';
import { TablaTransacciones, TablaTransaccionesPayload } from '@/types/tablaTransacciones.types';
import { useValidation } from '@/hooks/useValidation';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    dataToEdit?: TablaTransacciones | null;
}

const FormInput = ({ label, className, ...props }: any) => (
    <div className="flex flex-col gap-1.5 text-left">
        <label className="text-xs font-bold text-slate-500 uppercase">{label}</label>
        <input 
            className={`w-full border border-slate-200 p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400 transition-all uppercase ${className || ''}`} 
            {...props} 
        />
    </div>
);

export default function TransaccionFormModal({ isOpen, onClose, onSuccess, dataToEdit }: Props) {
    const [loading, setLoading] = useState(false);
    const EMPRESA_ID = "005"; 
    const { hasError, addError, clearError, resetErrors } = useValidation();

    // 🚀 OBTENER CATÁLOGOS LIMPIOS
    const { catalogs, loadingCatalogs } = useCatalogs([
        'TipoMovimiento',
        'TipoOperacion'
    ]);

    const initialState: TablaTransaccionesPayload = {
        descripcion: '',
        tipomovimientoId: '',
        tipoOperacionId: '',
        empresaId: EMPRESA_ID,
        tipoalmacenId: 3 // Mantenemos el valor por defecto fijo para compatibilidad
    };

    const [formData, setFormData] = useState<TablaTransaccionesPayload>(initialState);

    useEffect(() => {
        if (isOpen) {
            resetErrors();
            if (dataToEdit) {
                const almacenId = dataToEdit.tipoalmacenId 
                    || dataToEdit.TipoAlmacenAsociado?.tipoalmacenId 
                    || dataToEdit.ListaAlmacenes?.[0]?.tipoalmacenId
                    || 3;

                setFormData({
                    descripcion: String(dataToEdit.descripcion || '').toUpperCase(),
                    tipomovimientoId: dataToEdit.tipomovimientoId || '',
                    tipoOperacionId: dataToEdit.tipoOperacionId || '',
                    empresaId: dataToEdit.empresaId || EMPRESA_ID,
                    tipoalmacenId: almacenId 
                });
            } else {
                setFormData(initialState);
            }
        }
    }, [isOpen, dataToEdit]);

    const handleChange = (e: any) => {
        const { name, value } = e.target;
        const normalizedValue = name === 'descripcion' ? String(value || '').toUpperCase() : value;
        setFormData(prev => ({ ...prev, [name]: normalizedValue }));
        if (hasError(name)) clearError(name);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        resetErrors();
        if (!String(formData.descripcion || '').trim()) {
            addError('descripcion');
            return toast.error("La descripción de transacción es obligatoria.");
        }
        if (!String(formData.tipomovimientoId || '').trim()) {
            addError('tipomovimientoId');
            return toast.error("Tipo movimiento es obligatorio.");
        }
        if (!String(formData.tipoOperacionId || '').trim()) {
            addError('tipoOperacionId');
            return toast.error("Tipo operación es obligatorio.");
        }
        if (!String(formData.empresaId || '').trim()) {
            return toast.error("Empresa es obligatoria.");
        }
        if (!Number.isFinite(Number(formData.tipoalmacenId)) || Number(formData.tipoalmacenId) <= 0) {
            return toast.error("Tipo almacén es obligatorio.");
        }

        setLoading(true);
        try {
            const payload = {
                ...formData,
                descripcion: String(formData.descripcion || '').trim().toUpperCase()
            };

            let res;
            if (dataToEdit?.transaccionId) {
                res = await tablaTransaccionesService.update(dataToEdit.transaccionId, payload);
            } else {
                res = await tablaTransaccionesService.create(payload);
            }

            if (res.isSuccess) {
                toast.success(dataToEdit ? "Transacción actualizada" : "Transacción registrada");
                onSuccess();
                onClose();
            } else {
                toast.error(res.message || "Error al procesar");
            }
        } catch (error) {
            toast.error("Error de conexión");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={dataToEdit ? "Editar Transacción" : "Nueva Transacción"}
            size="lg"
        >
            <form onSubmit={handleSubmit} className="h-[72vh] flex flex-col">
                <div className="flex-1 overflow-visible pb-24 space-y-5">
                    {loadingCatalogs && (
                         <div className="bg-blue-50 text-blue-600 p-2 rounded text-xs flex items-center gap-2">
                             <IconLoader size={16} className="animate-spin" /> Cargando opciones...
                         </div>
                    )}
                    <FormInput 
                        label="Descripción de Transacción" 
                        name="descripcion" 
                        value={formData.descripcion} 
                        onChange={handleChange} 
                        required 
                        placeholder="Ej: COMPRA MERCADERIA LOCAL"
                        className={`font-semibold ${hasError('descripcion') ? 'border-red-300 focus:ring-red-200' : ''}`}
                    />

                    <div className="grid grid-cols-1 gap-5">
                        <div className={hasError('tipomovimientoId') ? 'rounded-xl ring-1 ring-red-200 p-1 bg-red-50/40' : ''}>
                            <SearchableSelect 
                                label="Tipo Movimiento" 
                                name="tipomovimientoId"
                                options={catalogs['TipoMovimiento'] || []}
                                value={formData.tipomovimientoId} 
                                onChange={handleChange}
                                disabled={loadingCatalogs}
                            />
                        </div>

                        <div className={hasError('tipoOperacionId') ? 'rounded-xl ring-1 ring-red-200 p-1 bg-red-50/40' : ''}>
                            <SearchableSelect 
                                label="Tipo Operación (SUNAT)" 
                                name="tipoOperacionId"
                                options={catalogs['TipoOperacion'] || []}
                                value={formData.tipoOperacionId} 
                                onChange={handleChange}
                                disabled={loadingCatalogs}
                            />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-4 border-t mt-auto sticky bottom-0 bg-white">
                    <button type="button" onClick={onClose} className="px-6 py-2 text-slate-500 font-bold hover:bg-slate-50 rounded-lg transition-colors text-xs">CANCELAR</button>
                    <button type="submit" disabled={loading || loadingCatalogs} className="bg-slate-900 text-white px-8 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50 text-xs">
                        {loading ? <IconLoader className="animate-spin" size={18}/> : <IconDeviceFloppy size={18}/>}
                        GUARDAR
                    </button>
                </div>
            </form>
        </Modal>
    );
}
