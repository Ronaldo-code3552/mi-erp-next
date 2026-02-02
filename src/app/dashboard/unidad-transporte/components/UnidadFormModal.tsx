"use client";
import { useState, useEffect } from 'react';
import { unidadTransporteService } from '@/services/unidadTransporteService';
import Modal from '@/components/ui/Modal';
import { UnidadTransporte } from '@/types/unidadTransporte.types';

export default function UnidadFormModal({ isOpen, onClose, onSuccess, dataToEdit }: any) {
    const [formData, setFormData] = useState<Partial<UnidadTransporte>>({});

    useEffect(() => { if(isOpen) setFormData(dataToEdit || { estado: '1' }); }, [isOpen, dataToEdit]);

    const handleSubmit = async (e: any) => {
        e.preventDefault();
        const res = dataToEdit ? await unidadTransporteService.update(dataToEdit.unidadtransporteId, formData) : await unidadTransporteService.create(formData);
        if(res.isSuccess) { onSuccess(); onClose(); }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Vehículo / Unidad">
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="text-[10px] font-bold text-slate-500">PLACA</label>
                        <input className="w-full border p-2.5 rounded-lg font-mono text-center text-lg" placeholder="ABC-123" value={formData.nro_matricula_cabina || ''} onChange={(e) => setFormData({...formData, nro_matricula_cabina: e.target.value.toUpperCase()})} />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-slate-500">CAPACIDAD (KG)</label>
                        <input type="number" className="w-full border p-2.5 rounded-lg" value={formData.peso_maximo || 0} onChange={(e) => setFormData({...formData, peso_maximo: Number(e.target.value)})} />
                    </div>
                </div>
                <button className="w-full bg-blue-600 text-white p-3 rounded-xl font-bold">REGISTRAR PLACA</button>
            </form>
        </Modal>
    );
}