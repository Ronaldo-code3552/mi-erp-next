"use client";
import { useState, useEffect } from 'react';
import { conductorService } from '@/services/conductorService';
import Modal from '@/components/ui/Modal';
import SearchableSelect from '@/components/forms/SearchableSelect';
import { IconUser, IconId, IconLoader, IconDeviceFloppy } from '@tabler/icons-react';
import { toast } from 'sonner';
import { Conductor } from '@/types/conductor.types';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    conductorToEdit?: Conductor | null;
}

export default function ConductorFormModal({ isOpen, onClose, onSuccess, conductorToEdit }: Props) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<Partial<Conductor>>({});

    useEffect(() => {
        if (isOpen) {
            setFormData(conductorToEdit! || { docidentId: '1', estado: '1' });
        }
    }, [isOpen, conductorToEdit]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const res = conductorToEdit 
            ? await conductorService.update(conductorToEdit.conductortransporteId!, formData)
            : await conductorService.create(formData);
        
        if (res.isSuccess) {
            toast.success("Operación exitosa");
            onSuccess();
            onClose();
        } else {
            toast.error(res.message);
        }
        setLoading(false);
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={conductorToEdit ? "Editar Conductor" : "Nuevo Conductor"}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Nombres Completos</label>
                        <input className="w-full border p-2.5 rounded-lg text-sm uppercase" value={formData.nombres || ''} onChange={(e) => setFormData({...formData, nombres: e.target.value.toUpperCase()})} required />
                    </div>
                    <div className="col-span-2">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Apellidos</label>
                        <input className="w-full border p-2.5 rounded-lg text-sm uppercase" value={formData.apellidos || ''} onChange={(e) => setFormData({...formData, apellidos: e.target.value.toUpperCase()})} required />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Nro. Documento (DNI)</label>
                        <input className="w-full border p-2.5 rounded-lg text-sm font-mono" value={formData.nro_documento || ''} onChange={(e) => setFormData({...formData, nro_documento: e.target.value})} required />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Nro. Licencia</label>
                        <input className="w-full border p-2.5 rounded-lg text-sm font-mono" value={formData.nro_licencia || ''} onChange={(e) => setFormData({...formData, nro_licencia: e.target.value})} />
                    </div>
                </div>
                <div className="flex justify-end gap-3 pt-4">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold text-slate-400">CANCELAR</button>
                    <button type="submit" disabled={loading} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold text-xs flex items-center gap-2">
                        {loading ? <IconLoader className="animate-spin" size={16}/> : <IconDeviceFloppy size={16}/>} GUARDAR
                    </button>
                </div>
            </form>
        </Modal>
    );
}