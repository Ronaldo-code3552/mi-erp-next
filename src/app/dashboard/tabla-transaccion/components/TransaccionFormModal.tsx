// src/app/dashboard/tabla-transacciones/components/TransaccionFormModal.tsx
"use client";
import { useState, useEffect } from 'react';
import { tablaTransaccionesService } from '@/services/tablaTransaccionesService';
import Modal from '@/components/ui/Modal';
import SearchableSelect from '@/components/forms/SearchableSelect';
import { IconDeviceFloppy, IconLoader } from '@tabler/icons-react';
import { toast } from 'sonner';
import { TablaTransacciones, TablaTransaccionesPayload } from '@/types/tablaTransacciones.types';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    dataToEdit?: TablaTransacciones | null;
}

// --- COMPONENTE AUXILIAR ---
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
    const [catalogs, setCatalogs] = useState<any>(null);

    const EMPRESA_ID = "005"; 

    // Estado inicial: tipoalmacenId por defecto es 3
    const initialState: TablaTransaccionesPayload = {
        descripcion: '',
        tipomovimientoId: '',
        tipoOperacionId: '',
        empresaId: EMPRESA_ID,
        tipoalmacenId: 3 // VALOR POR DEFECTO FIJO
    };

    const [formData, setFormData] = useState<TablaTransaccionesPayload>(initialState);

    useEffect(() => {
        if (isOpen) {
            tablaTransaccionesService.getFormDropdowns().then(res => {
                if (res.isSuccess) setCatalogs(res.data);
            });

            if (dataToEdit) {
                // Recuperamos el almacén actual (si existe) para no perderlo al editar otros campos
                const almacenId = dataToEdit.tipoalmacenId 
                    || dataToEdit.TipoAlmacenAsociado?.tipoalmacenId 
                    || 3; // Fallback a 3 si no tiene

                setFormData({
                    descripcion: dataToEdit.descripcion || '',
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
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            let res;
            if (dataToEdit?.transaccionId) {
                res = await tablaTransaccionesService.update(dataToEdit.transaccionId, formData);
            } else {
                res = await tablaTransaccionesService.create(formData);
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

    // Helper seguro para opciones
    const getOpts = (key: string) => catalogs?.[key]?.map((x: any) => ({ key: x.key, value: x.value })) || [];

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={dataToEdit ? "Editar Transacción" : "Nueva Transacción"}
            size="md" // Reducimos tamaño ya que hay menos campos
        >
            <form onSubmit={handleSubmit} className="space-y-5">
                
                <FormInput 
                    label="Descripción de Transacción" 
                    name="descripcion" 
                    value={formData.descripcion} 
                    onChange={handleChange} 
                    required 
                    placeholder="Ej: COMPRA MERCADERIA LOCAL"
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <SearchableSelect 
                        label="Tipo Movimiento" 
                        name="tipomovimientoId"
                        options={getOpts('tipo_movimiento')}
                        value={formData.tipomovimientoId} 
                        onChange={handleChange}
                    />

                    <SearchableSelect 
                        label="Tipo Operación (SUNAT)" 
                        name="tipoOperacionId"
                        options={getOpts('tipo_operacion')}
                        value={formData.tipoOperacionId} 
                        onChange={handleChange}
                    />
                </div>
                {/* Se eliminó el Select de Tipo Almacén */}

                <div className="flex justify-end gap-3 pt-4 border-t mt-4">
                    <button type="button" onClick={onClose} className="px-6 py-2 text-slate-500 font-bold hover:bg-slate-50 rounded-lg transition-colors text-xs">CANCELAR</button>
                    <button type="submit" disabled={loading} className="bg-slate-900 text-white px-8 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50 text-xs">
                        {loading ? <IconLoader className="animate-spin" size={18}/> : <IconDeviceFloppy size={18}/>}
                        GUARDAR
                    </button>
                </div>
            </form>
        </Modal>
    );
}