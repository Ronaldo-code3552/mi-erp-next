// src/app/dashboard/conductores/components/ConductorFormModal.tsx
"use client";
import { useState, useEffect } from 'react';
import { conductorService } from '@/services/conductorService';
import Modal from '@/components/ui/Modal';
import SearchableSelect from '@/components/forms/SearchableSelect';
import { 
    IconDeviceFloppy, 
    IconLoader
} from '@tabler/icons-react';
import { toast } from 'sonner';
import { Conductor } from '@/types/conductor.types';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    conductorToEdit?: Conductor | null;
}

// --- COMPONENTES AUXILIARES (SACADO FUERA) ---
const FormInput = ({ label, ...props }: any) => (
    <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-slate-500 uppercase">{label}</label>
        <input 
            className="w-full border border-slate-200 p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400 transition-all" 
            {...props} 
        />
    </div>
);

// --- COMPONENTE PRINCIPAL ---
export default function ConductorFormModal({ isOpen, onClose, onSuccess, conductorToEdit }: Props) {
    const [loading, setLoading] = useState(false);
    const [catalogs, setCatalogs] = useState<any>(null);

    const isReadOnly = conductorToEdit?.estado === false;

    const initialState: Partial<Conductor> = {
        nombres: '', apellidos: '', docidentId: 'DNI', nro_documento: '',
        direccion: '', correo: '', ubidst: '', telefono_fijo: '',
        telefono_movil: '', licencia_conducir: '', empresaId: '005'
    };

    const [formData, setFormData] = useState<Partial<Conductor>>(initialState);

    useEffect(() => {
        if (isOpen) {
            conductorService.getFormDropdowns().then(res => {
                if (res.isSuccess) setCatalogs(res.data);
            });

            if (conductorToEdit) {
                setFormData({ ...initialState, ...conductorToEdit });
            } else {
                setFormData(initialState);
            }
        }
    }, [isOpen, conductorToEdit]);

    const handleChange = (e: any) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (conductorToEdit?.conductortransporteId) {
                await conductorService.update(conductorToEdit.conductortransporteId, formData);
                toast.success("Conductor actualizado correctamente");
            } else {
                await conductorService.create(formData);
                toast.success("Conductor registrado correctamente");
            }
            onSuccess();
            onClose();
        } catch (error) {
            toast.error("Error al procesar la solicitud");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={isReadOnly ? "Detalle Conductor (Solo Lectura)" : conductorToEdit ? "Editar Conductor" : "Nuevo Conductor"}
            size="lg"
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <FormInput label="Nombres" name="nombres" value={formData.nombres || ''} onChange={handleChange} required disabled={isReadOnly} />
                    <FormInput label="Apellidos" name="apellidos" value={formData.apellidos || ''} onChange={handleChange} required disabled={isReadOnly} />
                    
                    <SearchableSelect 
                        label="Tipo Doc." 
                        name="docidentId" 
                        options={catalogs?.documento_identidad} 
                        value={formData.docidentId || ''} 
                        onChange={handleChange} 
                        disabled={isReadOnly}
                    />
                    <FormInput label="Nro. Documento" name="nro_documento" value={formData.nro_documento || ''} onChange={handleChange} required disabled={isReadOnly} />
                    
                    <FormInput label="Licencia Conducir" name="licencia_conducir" value={formData.licencia_conducir || ''} onChange={handleChange} disabled={isReadOnly} />
                    <FormInput label="Teléfono Móvil" name="telefono_movil" value={formData.telefono_movil || ''} onChange={handleChange} disabled={isReadOnly} />
                    
                    <div className="md:col-span-2">
                        <FormInput label="Dirección" name="direccion" value={formData.direccion || ''} onChange={handleChange} disabled={isReadOnly} />
                    </div>
                </div>

                {!isReadOnly && (
                    <div className="flex justify-end gap-3 pt-4 border-t mt-4">
                        <button type="button" onClick={onClose} className="px-6 py-2 text-slate-500 font-bold hover:bg-slate-50 rounded-lg transition-colors">Cancelar</button>
                        <button type="submit" disabled={loading} className="bg-blue-600 text-white px-8 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50">
                            {loading ? <IconLoader className="animate-spin" size={20}/> : <IconDeviceFloppy size={20}/>}
                            {conductorToEdit ? 'Guardar Cambios' : 'Registrar'}
                        </button>
                    </div>
                )}
            </form>
        </Modal>
    );
}