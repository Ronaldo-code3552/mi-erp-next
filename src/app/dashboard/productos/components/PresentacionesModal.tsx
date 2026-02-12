// src/app/dashboard/productos/components/PresentacionesModal.tsx
"use client";
import { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import { IconDeviceFloppy, IconLoader, IconTrash, IconLock, IconAlertCircle } from '@tabler/icons-react';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import { presentacionService, Presentacion } from '@/services/presentacionService'; 
import { Producto } from '@/types/producto.types';

import { useValidation } from '@/hooks/useValidation';
import { getInputClasses } from '@/utils/formStyles';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    product: Producto | null | undefined;
}

type PresentacionUI = Omit<Presentacion, 'cantidad' | 'bienId'> & {
    cantidad: number | string;
    bienId?: string;
    tempId?: string | number;
    isNew?: boolean;
};

export default function PresentacionesModal({ isOpen, onClose, product }: Props) {
    const [loading, setLoading] = useState(false);
    const [rows, setRows] = useState<PresentacionUI[]>([]);
    const [units, setUnits] = useState<any[]>([]);
    
    const { hasError, clearError, validate, resetErrors, errors } = useValidation();

    useEffect(() => {
        if (isOpen && product) {
            resetErrors();
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
            
            const loadedRows: PresentacionUI[] = resData.data || [];
            const baseUnitId = product!.unidadmedidaId;
            const baseUnitName = resCats.data?.unidad_medida?.find((u:any) => String(u.key) === String(baseUnitId))?.value || '';

            const baseIndex = loadedRows.findIndex((r: any) => String(r.unidadmedidaId) === String(baseUnitId));

            if (baseIndex >= 0) {
                const [baseRow] = loadedRows.splice(baseIndex, 1);
                // Aseguramos que la fila base tenga cantidad 1 y descripción correcta si venía mal
                baseRow.cantidad = 1;
                baseRow.descripcion = `${baseUnitName} 1`; 
                loadedRows.unshift(baseRow);
            } else {
                loadedRows.unshift({
                    tempId: 'base-row',
                    unidadmedidaId: baseUnitId,
                    cantidad: 1,
                    descripcion: `${baseUnitName} 1`,
                    estado: true,
                    isNew: true
                } as PresentacionUI);
            }

            setRows([...loadedRows, createEmptyRow()]);

        } catch (error) {
            console.error(error);
            toast.error("Error al cargar presentaciones");
        } finally {
            setLoading(false);
        }
    };

    const createEmptyRow = (): PresentacionUI => ({
        tempId: Math.random(),
        unidadmedidaId: '',
        cantidad: '', 
        descripcion: '',
        estado: true,
        isNew: true
    });

    const handleCellChange = <K extends keyof PresentacionUI>(
        index: number,
        field: K,
        value: PresentacionUI[K]
    ) => {
        // 1. PROTECCIÓN FILA BASE: No permitir cambios en Unidad, Cantidad o Estado
        if (index === 0) {
            if (field === 'unidadmedidaId' || field === 'cantidad' || field === 'estado') return;
        }

        const newRows = [...rows];
        newRows[index][field] = value;

        clearError(`${index}-${field}`);

        // 2. LÓGICA DE AUTO-DESCRIPCIÓN
        // Si cambia Unidad o Cantidad, regeneramos la descripción
        if (field === 'unidadmedidaId' || field === 'cantidad') {
            const unitId = newRows[index].unidadmedidaId;
            const unitLabel = units.find(u => String(u.key) === String(unitId))?.value || '';
            const qty = newRows[index].cantidad; // Puede ser string vacío
            
            if(unitLabel && qty && Number(qty) > 0) {
                 newRows[index].descripcion = `${unitLabel} ${qty}`.trim();
                 clearError(`${index}-descripcion`);
            } else if (!unitId || !qty) {
                 newRows[index].descripcion = ''; // Limpiar si faltan datos
            }
        }

        if (index === rows.length - 1 && value !== '') {
            newRows.push(createEmptyRow());
        }
        setRows(newRows);
    };

    const handleDeleteRow = async (index: number) => {
        if (index === 0) return;

        const rowToDelete = rows[index];

        if (!rowToDelete.presentacionId) {
            const newRows = rows.filter((_, i) => i !== index);
            if (newRows.length === 1) newRows.push(createEmptyRow());
            setRows(newRows);
            return;
        }

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
                const res = await presentacionService.delete(rowToDelete.presentacionId);
                if (res.isSuccess) {
                    toast.success("Presentación eliminada");
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

        const validationRules: Record<string, any> = {};
        const validRows: any[] = [];

        rows.forEach((row, idx) => {
            if (idx === rows.length - 1 && !row.unidadmedidaId && !row.cantidad && !row.descripcion) {
                return;
            }
            
            validationRules[`${idx}-unidadmedidaId`] = row.unidadmedidaId;
            validationRules[`${idx}-cantidad`] = Number(row.cantidad);
            // La descripción se valida implícitamente, pero igual chequeamos que se haya generado
            validationRules[`${idx}-descripcion`] = row.descripcion;
            
            validRows.push({ ...row, idx });
        });

        if (!validate(validationRules)) {
            toast.error("Por favor complete los campos marcados en rojo.");
            return;
        }

        setLoading(true);
        try {
            for (const row of validRows) {
                // Protección extra: Fila 0 siempre cantidad 1
                const cantidadFinal = row.idx === 0 ? 1 : parseFloat(row.cantidad as string);

                const payload = {
                    bienId: product.bienId,
                    descripcion: row.descripcion, // Se envía lo calculado
                    cantidad: cantidadFinal,
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
                    toast.error(`Error guardando: ${row.descripcion}`);
                }
            }
            toast.success("Presentaciones actualizadas correctamente");
            onClose();
        } catch (error) {
            toast.error("Error crítico al guardar");
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
                            <th className="p-3 border-b">
                                Unidad Medida <span className="text-red-500">*</span>
                            </th>
                            <th className="p-3 border-b w-32">
                                Cantidad <span className="text-red-500">*</span>
                            </th>
                            <th className="p-3 border-b">
                                Descripción <span className="text-slate-400 font-normal">(Auto)</span>
                            </th>
                            <th className="p-3 border-b w-24 text-center">Estado</th>
                            <th className="p-3 border-b w-10"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, idx) => (
                            <tr key={row.presentacionId || row.tempId} className={`border-b transition-colors ${idx === 0 ? 'bg-blue-50/50' : 'hover:bg-slate-50'}`}>
                                <td className="p-3 text-center text-slate-400 text-xs">
                                    {idx === 0 ? <IconLock size={14} className="text-blue-500 mx-auto" /> : idx + 1}
                                </td>
                                
                                {/* UNIDAD MEDIDA */}
                                <td className="p-2 relative">
                                    <select 
                                        className={getInputClasses(hasError(`${idx}-unidadmedidaId`), idx === 0, 'uppercase')}
                                        value={row.unidadmedidaId}
                                        onChange={(e) => handleCellChange(idx, 'unidadmedidaId', e.target.value)}
                                        disabled={idx === 0} 
                                    >
                                        <option value="">-- SEL --</option>
                                        {getAvailableUnits(idx).map((u: any) => (
                                            <option key={u.key} value={u.key}>{u.value}</option>
                                        ))}
                                    </select>
                                    {hasError(`${idx}-unidadmedidaId`) && <IconAlertCircle size={14} className="text-red-500 absolute right-8 top-1/2 -translate-y-1/2" />}
                                </td>

                                {/* CANTIDAD */}
                                <td className="p-2 relative">
                                    <input 
                                        type="number" 
                                        // 3. APLICAMOS disabled={idx === 0} AQUÍ
                                        className={getInputClasses(hasError(`${idx}-cantidad`), idx === 0, 'text-right')}
                                        value={row.cantidad}
                                        onChange={(e) => handleCellChange(idx, 'cantidad', e.target.value)}
                                        placeholder="0"
                                        disabled={idx === 0} 
                                    />
                                </td>

                                {/* DESCRIPCIÓN (SIEMPRE READONLY) */}
                                <td className="p-2 relative">
                                    <input 
                                        type="text" 
                                        // 4. SIEMPRE DISABLED VISUALMENTE
                                        className={getInputClasses(hasError(`${idx}-descripcion`), true, 'text-slate-600 bg-slate-50 font-bold')}
                                        value={row.descripcion}
                                        readOnly // Bloqueo real
                                        tabIndex={-1} // Saltar al tabear
                                        placeholder="Generado autom..."
                                    />
                                </td>

                                {/* ESTADO */}
                                <td className="p-2 text-center">
                                    <input 
                                        type="checkbox" 
                                        checked={row.estado} 
                                        onChange={(e) => handleCellChange(idx, 'estado', e.target.checked)} 
                                        className="accent-blue-600 w-4 h-4 cursor-pointer align-middle disabled:opacity-50" 
                                        disabled={idx === 0} // Bloqueado para la fila base
                                    />
                                </td>

                                <td className="p-2 text-center">
                                    {idx !== 0 && (row.unidadmedidaId !== '' || row.presentacionId) && (
                                        <button 
                                            onClick={() => handleDeleteRow(idx)}
                                            className="text-slate-300 hover:text-red-500 transition-colors"
                                            title="Eliminar"
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

            {errors.size > 0 && (
                <div className="mx-2 mt-4 p-2 bg-red-50 border border-red-100 rounded text-red-600 text-xs flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
                    <IconAlertCircle size={16} />
                    <span>Hay <b>{errors.size}</b> campo(s) con errores. Por favor verifique los cuadros rojos.</span>
                </div>
            )}

            <div className="flex justify-end gap-3 mt-4 pt-4 border-t px-2">
                 <button 
                    onClick={handleSaveAll}
                    disabled={loading}
                    className="bg-green-600 hover:bg-green-700 text-white px-8 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all active:scale-95 text-xs tracking-wide disabled:opacity-50"
                >
                    {loading ? <IconLoader className="animate-spin" size={18}/> : <IconDeviceFloppy size={18}/>}
                    GUARDAR CAMBIOS
                </button>
            </div>
        </Modal>
    );
}