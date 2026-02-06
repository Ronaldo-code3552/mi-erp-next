// src/app/dashboard/transportistas/components/TransportistaFormModal.tsx
"use client";
import { useState, useEffect } from 'react';
import { transportistaService } from '@/services/transportistaService';
import Modal from '@/components/ui/Modal';
import SearchableSelect from '@/components/forms/SearchableSelect';
import { IconDeviceFloppy, IconLoader } from '@tabler/icons-react';
import { toast } from 'sonner';
import { Transportista } from '@/types/transportista.types';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    transportistaToEdit?: Transportista | null;
}

// --- COMPONENTE AUXILIAR CORREGIDO ---
// Ahora extraemos 'className' de las props y lo concatenamos al final
const FormInput = ({ label, className, ...props }: any) => (
    <div className="flex flex-col gap-1.5 text-left">
        <label className="text-xs font-bold text-slate-500 uppercase">{label}</label>
        <input 
            // Aquí está la corrección: ${className || ''} permite agregar estilos extra sin borrar los base
            className={`w-full border border-slate-200 p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400 transition-all uppercase ${className || ''}`} 
            {...props} 
        />
    </div>
);

// --- COMPONENTE PRINCIPAL ---
export default function TransportistaFormModal({ isOpen, onClose, onSuccess, transportistaToEdit }: Props) {
    const [loading, setLoading] = useState(false);
    const [catalogs, setCatalogs] = useState<any>(null);

    const isReadOnly = !!(transportistaToEdit && transportistaToEdit.estado === false);

    const initialState: Partial<Transportista> = {
        descripcion: '', 
        direccion: '', 
        docidentId: '6', 
        numero_doc: '',
        empresaId: '005'
    };

    const [formData, setFormData] = useState<Partial<Transportista>>(initialState);

    useEffect(() => {
        if (isOpen) {
            transportistaService.getFormDropdowns().then(res => {
                if (res.isSuccess) setCatalogs(res.data);
            });

            if (transportistaToEdit) {
                setFormData({
                    descripcion: transportistaToEdit.descripcion || '',
                    direccion: transportistaToEdit.direccion || '',
                    docidentId: transportistaToEdit.docidentId || '6',
                    numero_doc: transportistaToEdit.numero_doc || '',
                    empresaId: '005'
                });
            } else {
                setFormData(initialState);
            }
        }
    }, [isOpen, transportistaToEdit]);

    const handleChange = (e: any) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const payload = {
            ...formData,
            empresaId: '005' 
        };
        try {
            if (transportistaToEdit?.transportistaId) {
                await transportistaService.update(transportistaToEdit.transportistaId, payload);
                toast.success("Transportista actualizado correctamente");
            } else {
                await transportistaService.create(payload);
                toast.success("Transportista registrado correctamente");
            }
            onSuccess();
            onClose();
        } catch (error) {
            console.error(error); // Es bueno ver el error en consola para depurar
            toast.error("Error al procesar la solicitud");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={isReadOnly ? "Detalle Transportista" : transportistaToEdit ? "Editar Transportista" : "Nuevo Transportista"}
            size="lg"
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className="md:col-span-2">
                        <FormInput 
                            label="Razón Social / Nombre" 
                            name="descripcion" 
                            value={formData.descripcion || ''} 
                            onChange={handleChange} 
                            required 
                            disabled={isReadOnly} 
                            placeholder="Ej: TRANSPORTES SAC" 
                        />
                    </div>
                    
                    <SearchableSelect 
                        label="Tipo Doc." 
                        name="docidentId" 
                        options={catalogs?.documento_identidad} 
                        value={formData.docidentId || ''} 
                        onChange={handleChange} 
                        disabled={isReadOnly}
                    />
                    
                    {/* AHORA ESTE INPUT MANTENDRÁ LOS ESTILOS BASE + FONT-MONO */}
                    <FormInput 
                        label="Número Documento" 
                        name="numero_doc" 
                        value={formData.numero_doc || ''} 
                        onChange={handleChange} 
                        required 
                        disabled={isReadOnly} 
                        className="font-mono"
                    />
                    
                    <div className="md:col-span-2">
                        <FormInput 
                            label="Dirección Legal" 
                            name="direccion" 
                            value={formData.direccion || ''} 
                            onChange={handleChange} 
                            disabled={isReadOnly} 
                        />
                    </div>
                </div>

                {!isReadOnly && (
                    <div className="flex justify-end gap-3 pt-4 border-t mt-4">
                        <button type="button" onClick={onClose} className="px-6 py-2 text-slate-500 font-bold hover:bg-slate-50 rounded-lg transition-colors">Cancelar</button>
                        <button type="submit" disabled={loading} className="bg-blue-600 text-white px-8 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50">
                            {loading ? <IconLoader className="animate-spin" size={20}/> : <IconDeviceFloppy size={20}/>}
                            {transportistaToEdit ? 'Guardar Cambios' : 'Registrar'}
                        </button>
                    </div>
                )}
            </form>
        </Modal>
    );
}