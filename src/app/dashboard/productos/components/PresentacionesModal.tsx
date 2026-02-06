"use client";
import { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import { IconDeviceFloppy, IconLoader, IconTrash, IconLock } from '@tabler/icons-react';
import { toast } from 'sonner';
import Swal from 'sweetalert2'; // Importamos SweetAlert para la confirmación
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
            
            let loadedRows = resData.data || [];
            const baseUnitId = product!.unidadmedidaId;
            const baseUnitName = resCats.data?.unidad_medida?.find((u:any) => String(u.key) === String(baseUnitId))?.value || '';

            // --- LÓGICA 1: GARANTIZAR QUE LA UNIDAD BASE SEA LA PRIMERA (INDEX 0) ---
            const baseIndex = loadedRows.findIndex((r: any) => String(r.unidadmedidaId) === String(baseUnitId));

            if (baseIndex >= 0) {
                const [baseRow] = loadedRows.splice(baseIndex, 1);
                loadedRows.unshift(baseRow);
            } else {
                loadedRows.unshift({
                    tempId: 'base-row',
                    unidadmedidaId: baseUnitId,
                    cantidad: 1,
                    descripcion: `${baseUnitName} 1`,
                    estado: true,
                    isNew: true
                });
            }

            setRows([...loadedRows, createEmptyRow()]);

        } catch (error) {
            console.error(error);
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
        if (index === 0 && field === 'unidadmedidaId') return;

        const newRows = [...rows];
        newRows[index][field] = value;

        if (field === 'unidadmedidaId' || field === 'cantidad') {
            const unitLabel = units.find(u => String(u.key) === String(newRows[index].unidadmedidaId))?.value || '';
            const qty = newRows[index].cantidad || 0;
            if(unitLabel) {
                 newRows[index].descripcion = `${unitLabel} ${qty}`.trim();
            }
        }

        if (index === rows.length - 1 && value !== '') {
            newRows.push(createEmptyRow());
        }
        setRows(newRows);
    };

    // --- LÓGICA DE ELIMINACIÓN HÍBRIDA ---
    const handleDeleteRow = async (index: number) => {
        // 1. Protección: Nunca eliminar la fila base (índice 0)
        if (index === 0) return;

        const rowToDelete = rows[index];

        // CASO A: Es una fila NUEVA (no guardada en BD)
        // Se identifica porque tiene 'isNew' true o no tiene 'presentacionId'
        if (!rowToDelete.presentacionId) {
            const newRows = rows.filter((_, i) => i !== index);
            // Aseguramos que siempre quede una fila vacía al final si borramos todo
            if (newRows.length === 1) { 
                newRows.push(createEmptyRow());
            }
            setRows(newRows);
            return;
        }

        // CASO B: Es una fila GUARDADA (tiene ID de BD)
        // Usamos SweetAlert para confirmar antes de llamar a la API
        const result = await Swal.fire({
            title: '¿Eliminar presentación?',
            text: "Se eliminará permanentemente de la base de datos.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#ef4444',
        });

        if (result.isConfirmed) {
            try {
                // Llamada al servicio DELETE
                const res = await presentacionService.delete(rowToDelete.presentacionId);
                
                if (res.isSuccess) {
                    toast.success("Presentación eliminada");
                    // Actualizamos el estado local quitando la fila
                    const newRows = rows.filter((_, i) => i !== index);
                    if (newRows.length === 1) newRows.push(createEmptyRow());
                    setRows(newRows);
                } else {
                    toast.error(res.message || "No se pudo eliminar");
                }
            } catch (error) {
                toast.error("Error al conectar con el servidor");
            }
        }
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
                        // Al crear, actualizamos el row local con el ID devuelto (opcional, pero buena práctica)
                        // Para simplificar, recargaremos todo al cerrar o confiamos en el reload del usuario
                        await presentacionService.create(payload);
                    }
                } catch (err) {
                    toast.error(`Error guardando: ${row.descripcion}`);
                }
            }
            toast.success("Presentaciones actualizadas");
            onClose();
        } catch (error) {
            toast.error("Error crítico");
        } finally {
            setLoading(false);
        }
    };

    const getAvailableUnits = (currentRowIndex: number) => {
        const allSelectedIds = rows.map(r => String(r.unidadmedidaId));
        return units.filter(u => {
            const isSelectedInCurrentRow = String(u.key) === String(rows[currentRowIndex].unidadmedidaId);
            const isNotSelectedElsewhere = !allSelectedIds.includes(String(u.key));
            return isSelectedInCurrentRow || isNotSelectedElsewhere;
        });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Presentaciones: ${product?.descripcion}`} size="xl">
            <div className="overflow-x-auto min-h-[300px]">
                <table className="w-full text-sm text-left border-collapse">
                    <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold">
                        <tr>
                            <th className="p-3 border-b w-10">#</th>
                            <th className="p-3 border-b">Unidad Medida</th>
                            <th className="p-3 border-b w-32">Cantidad</th>
                            <th className="p-3 border-b">Descripción</th>
                            <th className="p-3 border-b w-24 text-center">Estado</th>
                            <th className="p-3 border-b w-10"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, idx) => (
                            <tr key={row.presentacionId || row.tempId} className={`border-b transition-colors ${idx === 0 ? 'bg-blue-50/30' : 'hover:bg-slate-50'}`}>
                                <td className="p-3 text-center text-slate-400 text-xs">
                                    {idx === 0 ? <IconLock size={14} className="text-blue-400 mx-auto" /> : idx + 1}
                                </td>
                                <td className="p-2">
                                    <select 
                                        className={`w-full p-2 border rounded outline-none focus:ring-1 focus:ring-blue-500 transition-all text-xs uppercase
                                            ${idx === 0 
                                                ? 'bg-slate-100 text-slate-500 font-bold border-slate-200 cursor-not-allowed'
                                                : 'bg-white border-slate-200'
                                            }`}
                                        value={row.unidadmedidaId}
                                        onChange={(e) => handleCellChange(idx, 'unidadmedidaId', e.target.value)}
                                        disabled={idx === 0} 
                                    >
                                        <option value="">-- Sel --</option>
                                        {getAvailableUnits(idx).map((u: any) => (
                                            <option key={u.key} value={u.key}>{u.value}</option>
                                        ))}
                                    </select>
                                </td>
                                <td className="p-2">
                                    <input 
                                        type="number" 
                                        className="w-full p-2 border rounded outline-none text-right focus:ring-1 focus:ring-blue-500 text-xs"
                                        value={row.cantidad}
                                        onChange={(e) => handleCellChange(idx, 'cantidad', e.target.value)}
                                    />
                                </td>
                                <td className="p-2">
                                    <input type="text" readOnly className="w-full p-2 bg-transparent text-slate-500 italic border-none text-xs outline-none"
                                        value={row.descripcion}
                                    />
                                </td>
                                <td className="p-2 text-center">
                                    <input 
                                        type="checkbox" 
                                        checked={row.estado} 
                                        onChange={(e) => handleCellChange(idx, 'estado', e.target.checked)} 
                                        className="accent-blue-600 w-4 h-4 cursor-pointer align-middle" 
                                    />
                                </td>
                                <td className="p-2 text-center">
                                    {idx !== 0 && row.unidadmedidaId !== '' && (
                                        <button 
                                            // Llamamos a nuestra función local personalizada
                                            onClick={() => handleDeleteRow(idx)}
                                            className="text-slate-300 hover:text-red-500 transition-colors"
                                            title={row.presentacionId ? "Eliminar de BD" : "Quitar fila"}
                                        >
                                            <IconTrash size={16} />
                                        </button>
                                    )}
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
                    className="bg-green-600 hover:bg-green-700 text-white px-8 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all active:scale-95 text-xs tracking-wide"
                >
                    {loading ? <IconLoader className="animate-spin" size={18}/> : <IconDeviceFloppy size={18}/>}
                    GUARDAR CAMBIOS
                </button>
            </div>
        </Modal>
    );
}