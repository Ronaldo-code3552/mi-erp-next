// src/app/dashboard/productos/components/PresentacionesModal.tsx
"use client";
import { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import { IconDeviceFloppy, IconLoader, IconX, IconPlus } from '@tabler/icons-react';
import { toast } from 'sonner';
// Asumo que crearás este servicio basado en el código React que mostraste
import { presentacionService } from '@/services/presentacionService'; 
import { Producto } from '@/types/producto.types';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    product: Producto | null | undefined;
}

export default function PresentacionesModal({ isOpen, onClose, product }: Props) {
    const [loading, setLoading] = useState(false);
    const [rows, setRows] = useState<any[]>([]);
    const [units, setUnits] = useState<any[]>([]);

    useEffect(() => {
        if (isOpen && product) {
            loadData();
        }
    }, [isOpen, product]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [resData, resCats] = await Promise.all([
                presentacionService.getByBien(product!.bienId),
                presentacionService.getFormDropdowns()
            ]);
            
            setUnits(resCats.data?.unidad_medida || []);
            const initialRows = resData.data.length > 0 
                ? resData.data 
                : [{ tempId: Date.now(), unidadmedidaId: '', cantidad: 0, descripcion: '', estado: true, isNew: true }];
            
            setRows([...initialRows, createEmptyRow()]);
        } catch (error) {
            toast.error("Error al cargar presentaciones");
        } finally {
            setLoading(false);
        }
    };

    const createEmptyRow = () => ({
        tempId: Math.random(),
        unidadmedidaId: '',
        cantidad: 0,
        descripcion: '',
        estado: true,
        isNew: true
    });

    const handleCellChange = (index: number, field: string, value: any) => {
        const newRows = [...rows];
        newRows[index][field] = value;

        if (field === 'unidadmedidaId' || field === 'cantidad') {
            const unitLabel = units.find(u => u.key === newRows[index].unidadmedidaId)?.value || '';
            const qty = newRows[index].cantidad || 0;
            newRows[index].descripcion = `${unitLabel} ${qty}`.trim();
        }

        if (index === rows.length - 1 && value !== '') {
            newRows.push(createEmptyRow());
        }
        setRows(newRows);
    };

    const handleSaveAll = async () => {
        if(!product) return;
        setLoading(true);
        try {
            const validRows = rows.filter(r => r.unidadmedidaId !== '');
            for (const row of validRows) {
                const payload = {
                    bienId: product.bienId,
                    descripcion: row.descripcion,
                    cantidad: parseFloat(row.cantidad),
                    unidadmedidaId: row.unidadmedidaId,
                    estado: row.estado
                };

                try {
                    if (row.presentacionId) {
                        await presentacionService.update(row.presentacionId, payload);
                    } else {
                        await presentacionService.create(payload);
                    }
                } catch (err) {
                    toast.error(`Fallo en fila: ${row.descripcion}.`);
                    setLoading(false);
                    return; 
                }
            }
            toast.success("Presentaciones guardadas");
            onClose();
        } catch (error) {
            toast.error("Error crítico");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Presentaciones: ${product?.descripcion}`} size="xl">
            <div className="overflow-x-auto min-h-[300px]">
                <table className="w-full text-sm text-left border-collapse">
                    <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold">
                        <tr>
                            <th className="p-3 border-b">Unidad Medida</th>
                            <th className="p-3 border-b w-32">Cantidad</th>
                            <th className="p-3 border-b">Descripción (Auto)</th>
                            <th className="p-3 border-b w-24">Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, idx) => (
                            <tr key={row.presentacionId || row.tempId} className="border-b hover:bg-slate-50 transition-colors">
                                <td className="p-2">
                                    <select 
                                        className="w-full p-1.5 border rounded outline-none focus:ring-1 focus:ring-blue-500"
                                        value={row.unidadmedidaId}
                                        onChange={(e) => handleCellChange(idx, 'unidadmedidaId', e.target.value)}
                                    >
                                        <option value="">-- Sel --</option>
                                        {units.map((u: any) => <option key={u.key} value={u.key}>{u.value}</option>)}
                                    </select>
                                </td>
                                <td className="p-2">
                                    <input type="number" className="w-full p-1.5 border rounded outline-none text-right"
                                        value={row.cantidad}
                                        onChange={(e) => handleCellChange(idx, 'cantidad', e.target.value)}
                                    />
                                </td>
                                <td className="p-2">
                                    <input type="text" readOnly className="w-full p-1.5 bg-slate-50 text-slate-500 italic"
                                        value={row.descripcion}
                                    />
                                </td>
                                <td className="p-2 text-center">
                                    <input type="checkbox" checked={row.estado} onChange={(e) => handleCellChange(idx, 'estado', e.target.checked)} className="accent-blue-600" />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                 <button 
                    onClick={handleSaveAll}
                    disabled={loading}
                    className="bg-green-600 text-white px-8 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg"
                >
                    {loading ? <IconLoader className="animate-spin" size={20}/> : <IconDeviceFloppy size={20}/>}
                    Guardar Cambios
                </button>
            </div>
        </Modal>
    );
}