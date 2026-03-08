// src/app/dashboard/productos/components/PresentacionesModal.tsx
"use client";
import { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import { useCatalogs } from '@/hooks/useCatalogs'; // 🚀 Importamos nuestro hook estrella
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
    
    // 🧹 ELIMINADO: const [units, setUnits] = useState<any[]>([]);
    
    const { hasError, clearError, validate, resetErrors, errors } = useValidation();
    const normalizeId = (value: unknown) => (typeof value === 'string' ? value.trim() : value);

    // 🚀 MAGIA: Usamos el caché global. Solo se descargará si no está en memoria.
    const { catalogs, loadingCatalogs } = useCatalogs(isOpen ? ['UnidadMedida'] : []);

    // Sincronización: Esperamos a que los catálogos carguen antes de pintar la data del producto
    useEffect(() => {
        if (isOpen && product && !loadingCatalogs && catalogs['UnidadMedida']) {
            resetErrors();
            loadData(catalogs['UnidadMedida']); // Le pasamos el catálogo listo
        }
    }, [isOpen, product, loadingCatalogs, catalogs]);

    const loadData = async (currentUnits: any[]) => {
        setLoading(true);
        try {
            // Ya no hacemos Promise.all, solo pedimos la data real de las presentaciones
            const resData = await presentacionService.getByBien(product!.bienId);
            
            const loadedRows: PresentacionUI[] = (resData.data || []).map((row: PresentacionUI) => ({
                ...row,
                unidadmedidaId: String(normalizeId(row.unidadmedidaId) || '')
            }));
            const baseUnitId = String(normalizeId(product!.unidadmedidaId) || '');
            
            // 🚀 ACTUALIZADO: Buscamos por 'value' (ID) y obtenemos 'label' (Descripción)
            const baseUnitName = currentUnits.find((u:any) => String(normalizeId(u.value)) === baseUnitId)?.label || '';

            const baseIndex = loadedRows.findIndex((r: any) => String(normalizeId(r.unidadmedidaId)) === baseUnitId);

            if (baseIndex >= 0) {
                const [baseRow] = loadedRows.splice(baseIndex, 1);
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
        if (index === 0) {
            if (field === 'unidadmedidaId' || field === 'cantidad' || field === 'estado') return;
        }

        const newRows = [...rows];
        newRows[index][field] = field === 'unidadmedidaId'
            ? (normalizeId(value) as PresentacionUI[K])
            : value;
        clearError(`${index}-${field}`);

        if (field === 'unidadmedidaId' || field === 'cantidad') {
            const unitId = newRows[index].unidadmedidaId;
            
            // 🚀 ACTUALIZADO: Buscamos en el catálogo directamente
            const currentUnits = catalogs['UnidadMedida'] || [];
            const unitLabel = currentUnits.find(u => String(normalizeId(u.value)) === String(normalizeId(unitId)))?.label || '';
            const qty = newRows[index].cantidad; 
            
            if(unitLabel && qty && Number(qty) > 0) {
                 newRows[index].descripcion = `${unitLabel} ${qty}`.trim();
                 clearError(`${index}-descripcion`);
            } else if (!unitId || !qty) {
                 newRows[index].descripcion = ''; 
            }
        }

        if (index === rows.length - 1 && value !== '') {
            newRows.push(createEmptyRow());
        }
        setRows(newRows);
    };

    const handleDeleteRow = async (index: number) => { /* IGUAL */ 
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

    const handleSaveAll = async () => { /* IGUAL */ 
        if(!product) return;
        const validationRules: Record<string, any> = {};
        const validRows: any[] = [];
        rows.forEach((row, idx) => {
            if (idx === rows.length - 1 && !row.unidadmedidaId && !row.cantidad && !row.descripcion) return;
            validationRules[`${idx}-unidadmedidaId`] = row.unidadmedidaId;
            validationRules[`${idx}-cantidad`] = Number(row.cantidad);
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
                const cantidadFinal = row.idx === 0 ? 1 : parseFloat(row.cantidad as string);
                const payload = {
                    bienId: product.bienId,
                    descripcion: row.descripcion, 
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
        const currentUnits = catalogs['UnidadMedida'] || [];
        const allSelectedIds = rows.map(r => String(normalizeId(r.unidadmedidaId)));
        return currentUnits.filter(u => {
            // 🚀 Usamos u.value en vez de u.key para el chequeo de disponibilidad
            const unitValue = String(normalizeId(u.value));
            const isSelectedInCurrentRow = unitValue === String(normalizeId(rows[currentRowIndex].unidadmedidaId));
            const isNotSelectedElsewhere = !allSelectedIds.includes(unitValue);
            return isSelectedInCurrentRow || isNotSelectedElsewhere;
        });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Presentaciones: ${product?.descripcion}`} size="xl">
            {/* 🚀 Renderizamos spinner si los catálogos aún están cargando */}
            {loadingCatalogs ? (
                 <div className="flex justify-center items-center py-10 min-h-[300px]">
                     <IconLoader className="animate-spin text-blue-500" size={32} />
                     <span className="ml-2 text-slate-500 font-semibold">Cargando catálogos...</span>
                 </div>
            ) : (
                <div className="overflow-x-auto min-h-[300px]">
                    <table className="w-full text-sm text-left border-collapse">
                        <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold">
                            {/* ... TH se mantienen igual ... */}
                            <tr>
                                <th className="p-3 border-b w-10">#</th>
                                <th className="p-3 border-b">Unidad Medida <span className="text-red-500">*</span></th>
                                <th className="p-3 border-b w-32">Cantidad <span className="text-red-500">*</span></th>
                                <th className="p-3 border-b">Descripción <span className="text-slate-400 font-normal">(Auto)</span></th>
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
                                            value={String(normalizeId(row.unidadmedidaId) || '')}
                                            onChange={(e) => handleCellChange(idx, 'unidadmedidaId', e.target.value)}
                                            disabled={idx === 0} 
                                        >
                                            <option value="">-- SEL --</option>
                                            {/* 🚀 Usamos u.value y u.label */}
                                            {getAvailableUnits(idx).map((u: any) => (
                                                <option key={u.value} value={u.value}>{u.label} {u.aux ? `(${u.aux})` : ''}</option>
                                            ))}
                                        </select>
                                        {hasError(`${idx}-unidadmedidaId`) && <IconAlertCircle size={14} className="text-red-500 absolute right-8 top-1/2 -translate-y-1/2" />}
                                    </td>

                                    {/* CANTIDAD */}
                                    <td className="p-2 relative">
                                        <input 
                                            type="number" 
                                            className={getInputClasses(hasError(`${idx}-cantidad`), idx === 0, 'text-right')}
                                            value={row.cantidad}
                                            onChange={(e) => handleCellChange(idx, 'cantidad', e.target.value)}
                                            placeholder="0"
                                            disabled={idx === 0} 
                                        />
                                    </td>

                                    {/* DESCRIPCIÓN */}
                                    <td className="p-2 relative">
                                        <input 
                                            type="text" 
                                            className={getInputClasses(hasError(`${idx}-descripcion`), true, 'text-slate-600 bg-slate-50 font-bold')}
                                            value={row.descripcion}
                                            readOnly 
                                            tabIndex={-1} 
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
                                            disabled={idx === 0} 
                                        />
                                    </td>

                                    {/* ACCIONES */}
                                    <td className="p-2 text-center">
                                        {idx !== 0 && (row.unidadmedidaId !== '' || row.presentacionId) && (
                                            <button onClick={() => handleDeleteRow(idx)} className="text-slate-300 hover:text-red-500 transition-colors" title="Eliminar">
                                                <IconTrash size={16} />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {errors.size > 0 && (
                <div className="mx-2 mt-4 p-2 bg-red-50 border border-red-100 rounded text-red-600 text-xs flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2">
                    <IconAlertCircle size={16} />
                    <span>Hay <b>{errors.size}</b> campo(s) con errores. Por favor verifique los cuadros rojos.</span>
                </div>
            )}

            <div className="flex justify-end gap-3 mt-4 pt-4 border-t px-2">
                 <button 
                    onClick={handleSaveAll}
                    disabled={loading || loadingCatalogs}
                    className="bg-green-600 hover:bg-green-700 text-white px-8 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all active:scale-95 text-xs tracking-wide disabled:opacity-50"
                >
                    {loading ? <IconLoader className="animate-spin" size={18}/> : <IconDeviceFloppy size={18}/>}
                    GUARDAR CAMBIOS
                </button>
            </div>
        </Modal>
    );
}
