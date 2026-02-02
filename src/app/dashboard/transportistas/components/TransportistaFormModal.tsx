"use client";
import { useState, useEffect } from 'react';
import { transportistaService } from '@/services/transportistaService';
import Modal from '@/components/ui/Modal';
import { Transportista } from '@/types/transportista.types';
import { toast } from 'sonner';

export default function TransportistaFormModal({ isOpen, onClose, onSuccess, dataToEdit }: any) {
    const [formData, setFormData] = useState<Partial<Transportista>>({});

    useEffect(() => { if(isOpen) setFormData(dataToEdit || { docidentId: '6' }); }, [isOpen, dataToEdit]);

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        const res = dataToEdit ? await transportistaService.update(dataToEdit.transportistaId, formData) : await transportistaService.create(formData);
        if(res.isSuccess) { toast.success("Guardado"); onSuccess(); onClose(); }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Datos del Transportista">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">RUC / Nro Doc</label>
                    <input className="w-full border p-2.5 rounded-lg font-mono" value={formData.numero_doc || ''} onChange={(e) => setFormData({...formData, numero_doc: e.target.value})} />
                </div>
                <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase">Razón Social</label>
                    <input className="w-full border p-2.5 rounded-lg uppercase" value={formData.descripcion || ''} onChange={(e) => setFormData({...formData, descripcion: e.target.value.toUpperCase()})} />
                </div>
                <button className="w-full bg-slate-900 text-white p-3 rounded-xl font-bold text-xs">GUARDAR TRANSPORTISTA</button>
            </form>
        </Modal>
    );
}