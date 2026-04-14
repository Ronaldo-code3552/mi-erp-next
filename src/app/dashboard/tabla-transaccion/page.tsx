// src/app/dashboard/tabla-transacciones/page.tsx
"use client";
import { useState, useEffect } from "react";
import { useCrud } from "@/hooks/useCrud";
import { useDebounce } from "@/hooks/useDebounce";
import { useCatalogs } from "@/hooks/useCatalogs"; // 🚀 Importar useCatalogs
import { tablaTransaccionesService } from "@/services/tablaTransaccionesService";
import { TablaTransacciones } from "@/types/tablaTransacciones.types";

import DataTable from "@/components/shared/DataTable";
import SidebarFiltros from "@/components/filter/FiltrosAvanzados";
import MultiSelect from "@/components/forms/MultiSelect";
import TransaccionFormModal from "./components/TransaccionFormModal";
import TipoAlmacenLinkModal from "./components/TipoAlmacenLinkModal";

import { 
    IconArrowsExchange, IconRefresh, IconSearch, IconFilter, 
    IconEdit, IconTrash, IconBuildingWarehouse 
} from '@tabler/icons-react';
import { toast } from 'sonner';

export default function TablaTransaccionesPage() {
    const EMPRESA_ID = "005";

    const initialFilters = { tipo_movimiento: [], tipo_operacion: [] };

    const { 
        data, loading, meta, searchTerm, setSearchTerm, 
        filters, setFilters, fetchData, handleAction 
    } = useCrud<TablaTransacciones>(tablaTransaccionesService, EMPRESA_ID, initialFilters);

    const [tempFilters, setTempFilters] = useState<any>(initialFilters);
    const [showFilters, setShowFilters] = useState(false);
    const debouncedSearch = useDebounce(searchTerm, 500);

    // 🚀 REEMPLAZO DEL CÓDIGO TÓXICO POR USECATALOGS
    const { catalogs, loadingCatalogs } = useCatalogs([
        'TipoMovimiento',
        'TipoOperacion'
    ]);

    // --- ESTADOS PARA MODALES ---
    const [showForm, setShowForm] = useState(false);
    const [selected, setSelected] = useState<TablaTransacciones | null>(null);
    const [selectedForAlmacen, setSelectedForAlmacen] = useState<TablaTransacciones | null>(null);

    useEffect(() => { 
        fetchData(1, debouncedSearch, filters); 
    }, [debouncedSearch, filters, fetchData]);

    // Handlers
    const handleOpenSidebar = () => { setTempFilters(filters); setShowFilters(true); };
    const handleApplyFilters = () => { setFilters(tempFilters); setShowFilters(false); };
    const handleClearFilters = () => { setTempFilters(initialFilters); setFilters(initialFilters); };

    const handleManageAlmacenes = (row: TablaTransacciones) => {
        setSelectedForAlmacen(row);
    };

    const handleEdit = async (row: TablaTransacciones) => {
        if (!row.transaccionId) {
            toast.error("Transacción inválida.");
            return;
        }

        try {
            const res = await tablaTransaccionesService.getById(row.transaccionId);
            if (!res?.isSuccess || !res?.data) {
                toast.error(res?.message || "No se pudo cargar la transacción.");
                return;
            }

            setSelected(res.data);
            setShowForm(true);
        } catch (error: any) {
            toast.error(error?.response?.data?.message || "Error al cargar la transacción.");
        }
    };

    const columns = [
        { 
            header: 'Descripción', 
            render: (row: TablaTransacciones) => (
                <div className="flex flex-col">
                    <span className="font-bold text-slate-800 text-xs uppercase">{row.descripcion}</span>
                </div>
            )
        },
        { 
            header: 'Movimiento', width: '120px',
            render: (row: TablaTransacciones) => (
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    row.tipomovimientoId === 'I' ? 'bg-indigo-50 text-indigo-600' : 'bg-orange-50 text-orange-600'
                }`}>
                    {row.TipoMovimiento?.descripcion || row.tipomovimientoId}
                </span>
            )
        },
        { 
            header: 'Operación SUNAT', 
            render: (row: TablaTransacciones) => (
                <span className="text-xs text-slate-600">
                    {row.TipoOperacion?.descripcion || row.tipoOperacionId || '-'}
                </span>
            )
        },
        { 
            header: 'Acciones', className: 'text-center', width: '140px',
            render: (row: TablaTransacciones) => (
                <div className="flex justify-center gap-1">
                    <button onClick={() => handleEdit(row)} className="p-1.5 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded transition-colors" title="Editar"><IconEdit size={18} /></button>
                    <button onClick={() => handleManageAlmacenes(row)} className="p-1.5 hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 rounded transition-colors" title="Asignar Almacenes"><IconBuildingWarehouse size={18} /></button>
                    <button onClick={() => handleAction(row.transaccionId!, 'delete')} className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded" title="Eliminar"><IconTrash size={18} /></button>
                </div>
            )
        }
    ];

    // Helper para mapear los catálogos al formato requerido por MultiSelect
    const getOpts = (key: string) => catalogs?.[key]?.map((x: any) => ({ label: x.label || x.value, value: x.value })) || [];

    return (
        <div className="p-6 animate-fade-in-up">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Tabla de Transacciones</h1>
                    <p className="text-sm text-slate-500">Configuración de movimientos de inventario</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => fetchData(meta.currentPage)} className="p-2.5 bg-white border border-slate-300 rounded-lg hover:text-blue-600 shadow-sm"><IconRefresh size={20} className={loading ? "animate-spin" : ""} /></button>
                    <button onClick={() => { setSelected(null); setShowForm(true); }} className="bg-slate-900 text-white px-4 py-2.5 rounded-lg font-bold flex items-center gap-2 shadow-lg active:scale-95 text-xs"><IconArrowsExchange size={18} /> Nueva Transacción</button>
                </div>
            </div>

            <div className="flex gap-4 mb-4">
                <div className="relative flex-1">
                    <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input type="text" placeholder="Buscar..." className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl outline-none focus:border-blue-500 shadow-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                </div>
                <button onClick={handleOpenSidebar} className={`px-4 py-2.5 rounded-xl font-semibold flex items-center gap-2 border transition-all text-xs ${Object.values(filters).flat().length > 0 ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-slate-700 border-slate-300'}`}>
                    <IconFilter size={18} /> Filtros
                </button>
            </div>

            <DataTable columns={columns} data={data} loading={loading} meta={meta} onPageChange={fetchData} />

            <SidebarFiltros isOpen={showFilters} onClose={() => setShowFilters(false)} onApply={handleApplyFilters} onClear={handleClearFilters} totalActive={Object.values(tempFilters).flat().length}>
                {!loadingCatalogs ? (
                    <div className="flex flex-col gap-5">
                        <MultiSelect label="Tipo Movimiento" options={getOpts('TipoMovimiento')} value={tempFilters.tipo_movimiento} onChange={(v) => setTempFilters({...tempFilters, tipo_movimiento: v})} />
                        <MultiSelect label="Tipo Operación" options={getOpts('TipoOperacion')} value={tempFilters.tipo_operacion} onChange={(v) => setTempFilters({...tempFilters, tipo_operacion: v})} />
                    </div>
                ) : <div className="text-center py-10 text-slate-400 italic">Cargando filtros...</div>}
            </SidebarFiltros>

            {/* MODAL PRINCIPAL */}
            <TransaccionFormModal isOpen={showForm} onClose={() => setShowForm(false)} onSuccess={() => fetchData(meta.currentPage)} dataToEdit={selected} />

            {/* MODAL ALMACENES */}
            {selectedForAlmacen && (
                <TipoAlmacenLinkModal 
                    isOpen={!!selectedForAlmacen}
                    onClose={() => setSelectedForAlmacen(null)}
                    transaccionId={selectedForAlmacen.transaccionId || ''}
                    transaccionDescripcion={selectedForAlmacen.descripcion}
                />
            )}
        </div>
    );
}