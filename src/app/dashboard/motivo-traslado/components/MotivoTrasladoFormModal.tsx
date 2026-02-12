// src/app/dashboard/motivo-traslado/components/MotivoTrasladoFormModal.tsx
"use client";
import { useState, useEffect } from 'react';
import { motivoTrasladoService } from '@/services/motivoTrasladoService';
import Modal from '@/components/ui/Modal';
import { IconDeviceFloppy, IconLoader } from '@tabler/icons-react';
import { toast } from 'sonner';
import { MotivoTraslado, MotivoTrasladoPayload } from '@/types/motivoTraslado.types';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    dataToEdit?: MotivoTraslado | null;
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

export default function MotivoTrasladoFormModal({ isOpen, onClose, onSuccess, dataToEdit }: Props) {
    const [loading, setLoading] = useState(false);
    
    // Si necesitas cargar catálogos para otros campos futuros, lo dejas. 
    // Para este caso específico ya no parece necesario el dropdown de SUNAT ni Movimiento.
    // const [catalogs, setCatalogs] = useState<any>(null);

    const isReadOnly = !!(dataToEdit && dataToEdit.estado === false);

    const initialState: MotivoTrasladoPayload = {
        descripcion: '',
        COD_SUNAT: ''
    };

    const [formData, setFormData] = useState<MotivoTrasladoPayload>(initialState);

    useEffect(() => {
        if (isOpen) {
            // Cargar datos si es edición
            if (dataToEdit) {
                setFormData({
                    descripcion: dataToEdit.descripcion || '',
                    COD_SUNAT: dataToEdit.COD_SUNAT || ''
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
        
        if (!formData.descripcion || !formData.COD_SUNAT) {
            toast.error("Complete todos los campos");
            return;
        }

        setLoading(true);
        try {
            let res;
            if (dataToEdit?.motivotrasladoId) {
                res = await motivoTrasladoService.update(dataToEdit.motivotrasladoId, formData);
            } else {
                res = await motivoTrasladoService.create(formData);
            }

            if (res.isSuccess) {
                toast.success(dataToEdit ? "Registro actualizado" : "Registro creado");
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
            title={isReadOnly ? "Detalle Motivo (Lectura)" : dataToEdit ? "Editar Motivo" : "Nuevo Motivo Traslado"}
            size="md"
        >
            <form onSubmit={handleSubmit} className="space-y-5">
                
                <FormInput 
                    label="Descripción" 
                    name="descripcion" 
                    value={formData.descripcion} 
                    onChange={handleChange} 
                    required 
                    disabled={isReadOnly}
                    placeholder="Ej: VENTA ITINERANTE"
                />

                <div className="grid grid-cols-1 gap-4">
                    {/* AHORA ES UN INPUT DE TEXTO SIMPLE */}
                    <FormInput 
                        label="Código SUNAT" 
                        name="COD_SUNAT"
                        value={formData.COD_SUNAT} 
                        onChange={handleChange} 
                        required
                        disabled={isReadOnly}
                        placeholder="Ej: 01"
                        maxLength={3} // Opcional: limitar longitud
                        className="font-mono"
                    />
                </div>

                {!isReadOnly && (
                    <div className="flex justify-end gap-3 pt-4 border-t mt-4">
                        <button type="button" onClick={onClose} className="px-6 py-2 text-slate-500 font-bold hover:bg-slate-50 rounded-lg transition-colors text-xs">CANCELAR</button>
                        <button type="submit" disabled={loading} className="bg-slate-900 text-white px-8 py-2.5 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:bg-slate-800 transition-all active:scale-95 disabled:opacity-50 text-xs">
                            {loading ? <IconLoader className="animate-spin" size={18}/> : <IconDeviceFloppy size={18}/>}
                            GUARDAR
                        </button>
                    </div>
                )}
            </form>
        </Modal>
    );
}