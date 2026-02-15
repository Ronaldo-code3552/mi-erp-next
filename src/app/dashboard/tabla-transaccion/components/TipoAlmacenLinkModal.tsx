// src/app/dashboard/tabla-transacciones/components/TipoAlmacenLinkModal.tsx
"use client";
import { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import { tipoAlmacenLinkService } from '@/services/tipoAlmacenLinkService';
import { tablaTransaccionesService } from '@/services/tablaTransaccionesService';
import { IconTrash, IconDeviceFloppy, IconPlus, IconEdit, IconX, IconLoader, IconLock } from '@tabler/icons-react'; // <--- IconLock
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import { TipoAlmacenLink } from '@/types/tipoAlmacenLink.types';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    transaccionId: string;
    transaccionDescripcion: string;
}

export default function TipoAlmacenLinkModal({ isOpen, onClose, transaccionId, transaccionDescripcion }: Props) {
    const [loading, setLoading] = useState(false);
    const [links, setLinks] = useState<TipoAlmacenLink[]>([]);
    const [almacenOptions, setAlmacenOptions] = useState<any[]>([]);
    
    // ID que no se puede tocar
    const DEFAULT_ALMACEN_ID = 3;

    // Estados para edición/creación
    const [newAlmacenId, setNewAlmacenId] = useState<string>(""); 
    const [editingId, setEditingId] = useState<number | null>(null); 
    const [editValue, setEditValue] = useState<string>(""); 

    useEffect(() => {
        if (isOpen && transaccionId) {
            loadData();
        }
    }, [isOpen, transaccionId]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [resCatalogs, resList] = await Promise.all([
                tablaTransaccionesService.getFormDropdowns(),
                tipoAlmacenLinkService.getByTransaction(transaccionId)
            ]);

            if (resCatalogs.isSuccess) setAlmacenOptions(resCatalogs.data.tipo_almacen || []);
            
            // Ordenamos: Ponemos el DEFAULT (3) primero si existe
            let loadedLinks = resList.data || [];
            if (resList.isSuccess && loadedLinks.length > 0) {
                loadedLinks = loadedLinks.sort((a, b) => {
                    if (a.tipoalmacenId === DEFAULT_ALMACEN_ID) return -1;
                    if (b.tipoalmacenId === DEFAULT_ALMACEN_ID) return 1;
                    return 0;
                });
            }
            setLinks(loadedLinks);
            
        } catch (error) {
            console.error(error);
            toast.error("Error cargando datos de almacenes");
        } finally {
            setLoading(false);
        }
    };

    // --- ACCIONES CRUD ---

    const handleAdd = async () => {
        if (!newAlmacenId) return toast.warning("Seleccione un almacén");
        
        try {
            const res = await tipoAlmacenLinkService.create({
                transaccionId,
                tipoalmacenId: Number(newAlmacenId)
            });

            if (res.isSuccess) {
                toast.success("Almacén asignado");
                setNewAlmacenId("");
                loadData(); 
            } else {
                toast.error(res.message);
            }
        } catch (error) { toast.error("Error al asignar"); }
    };

    const handleDelete = async (tipoalmacenId: number) => {
        // Protección extra por si acaso
        if (tipoalmacenId === DEFAULT_ALMACEN_ID) return;

        const result = await Swal.fire({
            title: '¿Desvincular Almacén?',
            text: "Se eliminará la asignación.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, eliminar',
            confirmButtonColor: '#ef4444'
        });

        if (result.isConfirmed) {
            try {
                const res = await tipoAlmacenLinkService.delete(transaccionId, tipoalmacenId);
                if (res.isSuccess) {
                    toast.success("Eliminado correctamente");
                    loadData();
                } else {
                    toast.error(res.message);
                }
            } catch (e) { toast.error("Error al eliminar"); }
        }
    };

    const startEdit = (link: TipoAlmacenLink) => {
        // Protección extra
        if (link.tipoalmacenId === DEFAULT_ALMACEN_ID) return;
        
        setEditingId(link.tipoalmacenId);
        setEditValue(String(link.tipoalmacenId));
    };

    const cancelEdit = () => {
        setEditingId(null);
        setEditValue("");
    };

    const saveEdit = async () => {
        if (!editingId) return;
        if (Number(editValue) === editingId) { cancelEdit(); return; }

        try {
            const res = await tipoAlmacenLinkService.update({
                transaccionId,
                old_tipoalmacenId: editingId,
                new_tipoalmacenId: Number(editValue)
            });

            if (res.isSuccess) {
                toast.success("Actualizado correctamente");
                cancelEdit();
                loadData();
            } else {
                toast.error(res.message);
            }
        } catch (e) { toast.error("Error al actualizar"); }
    };

    const getAlmacenDesc = (id: number) => almacenOptions.find(a => Number(a.key) === id)?.value || `ID: ${id}`;

    // Filtrar opciones para no agregar duplicados
    const availableOptions = almacenOptions.filter(opt => !links.some(l => l.tipoalmacenId === Number(opt.key)));

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Asignar Almacenes: ${transaccionDescripcion}`} size="lg">
            <div className="space-y-6">
                
                {/* 1. BARRA DE AGREGAR */}
                <div className="flex gap-2 items-end bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <div className="flex-1">
                        <label className="text-xs font-bold text-slate-500 uppercase mb-1 block">Nuevo Almacén</label>
                        <select 
                            className="w-full border border-slate-300 p-2 rounded text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                            value={newAlmacenId}
                            onChange={(e) => setNewAlmacenId(e.target.value)}
                        >
                            <option value="">-- Seleccione Almacén --</option>
                            {availableOptions.map((opt: any) => (
                                <option key={opt.key} value={opt.key}>{opt.value}</option>
                            ))}
                        </select>
                    </div>
                    <button 
                        onClick={handleAdd}
                        disabled={!newAlmacenId}
                        className="bg-slate-900 text-white px-4 py-2 rounded font-bold text-xs h-[38px] flex items-center gap-2 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <IconPlus size={16}/> AGREGAR
                    </button>
                </div>

                {/* 2. LISTA DE ALMACENES ASIGNADOS */}
                <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px]">
                            <tr>
                                <th className="p-3">Almacén</th>
                                <th className="p-3 w-24 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {loading && links.length === 0 ? (
                                <tr><td colSpan={2} className="p-8 text-center"><IconLoader className="animate-spin mx-auto text-slate-400"/></td></tr>
                            ) : links.length === 0 ? (
                                <tr><td colSpan={2} className="p-8 text-center text-slate-400 italic">No hay almacenes asignados.</td></tr>
                            ) : (
                                links.map((link) => {
                                    // Determinar si es el item protegido
                                    const isDefault = link.tipoalmacenId === DEFAULT_ALMACEN_ID;

                                    return (
                                        <tr 
                                            key={link.tipoalmacenId} 
                                            className={`transition-colors ${isDefault ? 'bg-amber-50/50' : 'hover:bg-slate-50'}`}
                                        >
                                            <td className="p-3">
                                                {editingId === link.tipoalmacenId ? (
                                                    <select 
                                                        className="w-full border border-blue-300 p-1 rounded text-sm bg-white"
                                                        value={editValue}
                                                        onChange={(e) => setEditValue(e.target.value)}
                                                        autoFocus
                                                    >
                                                        {almacenOptions.filter(opt => Number(opt.key) === link.tipoalmacenId || !links.some(l => l.tipoalmacenId === Number(opt.key))).map((opt: any) => (
                                                            <option key={opt.key} value={opt.key}>{opt.value}</option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <span className={`font-medium ${isDefault ? 'text-amber-700' : 'text-slate-700'}`}>
                                                            {getAlmacenDesc(link.tipoalmacenId)}
                                                        </span>
                                                        {isDefault && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 rounded border border-amber-200">Default</span>}
                                                    </div>
                                                )}
                                            </td>
                                            
                                            {/* COLUMNA DE ACCIONES */}
                                            <td className="p-3 text-center">
                                                {isDefault ? (
                                                    // SI ES DEFAULT: MOSTRAR CANDADO
                                                    <div className="flex justify-center text-slate-300" title="Registro fijo del sistema">
                                                        <IconLock size={16} />
                                                    </div>
                                                ) : (
                                                    // SI ES NORMAL: MOSTRAR EDICIÓN/ELIMINACIÓN
                                                    editingId === link.tipoalmacenId ? (
                                                        <div className="flex justify-center gap-1">
                                                            <button onClick={saveEdit} className="p-1 text-green-600 hover:bg-green-50 rounded"><IconDeviceFloppy size={18}/></button>
                                                            <button onClick={cancelEdit} className="p-1 text-red-500 hover:bg-red-50 rounded"><IconX size={18}/></button>
                                                        </div>
                                                    ) : (
                                                        <div className="flex justify-center gap-1">
                                                            <button onClick={() => startEdit(link)} className="p-1 text-blue-500 hover:bg-blue-50 rounded"><IconEdit size={18}/></button>
                                                            <button onClick={() => handleDelete(link.tipoalmacenId)} className="p-1 text-red-500 hover:bg-red-50 rounded"><IconTrash size={18}/></button>
                                                        </div>
                                                    )
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="flex justify-end pt-2 border-t">
                    <button onClick={onClose} className="px-6 py-2 bg-slate-100 text-slate-600 font-bold rounded hover:bg-slate-200 text-xs">
                        CERRAR
                    </button>
                </div>
            </div>
        </Modal>
    );
}