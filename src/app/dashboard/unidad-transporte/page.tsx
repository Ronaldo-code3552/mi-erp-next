// src/app/dashboard/unidad-transporte/page.tsx
"use client";
import { useState, useEffect } from "react";
import { useCrud } from "@/hooks/useCrud";
import { useDebounce } from "@/hooks/useDebounce";
import { unidadTransporteService } from "@/services/unidadTransporteService";
import { UnidadTransporte } from "@/types/unidadTransporte.types";

import DataTable from "@/components/shared/DataTable";
import SidebarFiltros from "@/components/filter/FiltrosAvanzados";
import MultiSelect from "@/components/forms/MultiSelect";
import UnidadFormModal from "./components/UnidadFormModal";

import { 
    IconSteeringWheel, IconRefresh, IconSearch, IconFilter, 
    IconEdit, IconBan, IconTrash, IconEye
} from '@tabler/icons-react';

export default function UnidadTransportePage() {
    const EMPRESA_ID = "005";

    // Filtros oficiales para el Hook
    const initialFilters = { marca: [], modelo: [] };

    const { 
        data, loading, meta, searchTerm, setSearchTerm, 
        filters, setFilters, fetchData, handleAction 
    } = useCrud<UnidadTransporte>(unidadTransporteService, EMPRESA_ID, initialFilters);

    // Estados para el Sidebar (Temporales)
    const [tempFilters, setTempFilters] = useState<any>(initialFilters);
    const [showFilters, setShowFilters] = useState(false);
    
    // Estados para el Formulario
    const [showForm, setShowForm] = useState(false);
    const [selected, setSelected] = useState<UnidadTransporte | null>(null);
    const [catalogs, setCatalogs] = useState<any>(null);

    const debouncedSearch = useDebounce(searchTerm, 500);

    // Cargar Catálogos
    useEffect(() => {
        unidadTransporteService.getFormDropdowns().then(res => {
            if (res.isSuccess) setCatalogs(res.data);
        });
    }, []);

    // Fetch Data
    useEffect(() => { 
        fetchData(1, debouncedSearch, filters); 
    }, [debouncedSearch, filters, fetchData]);

    // --- LÓGICA DEL SIDEBAR ---
    const handleOpenSidebar = () => {
        setTempFilters(filters);
        setShowFilters(true);
    };

    const handleApplyFilters = () => {
        setFilters(tempFilters);
        setShowFilters(false);
    };

    // Filtro inteligente: Solo mostrar modelos de las marcas seleccionadas en el filtro
    const modelosDisponiblesParaFiltro = catalogs?.modelo?.filter((mod: any) => 
        tempFilters.marca.length === 0 || tempFilters.marca.includes(String(mod.groupKey || mod.marcaId))
    ) || [];

    // --- COLUMNAS (Estilo React Restaurado) ---
    const columns = [
        { 
            header: 'Placa', 
            width: '100px',
            render: (row: UnidadTransporte) => (
                <div className="bg-slate-800 text-white px-2.5 py-1 rounded text-xs font-bold font-mono border-2 border-slate-600 shadow-sm w-fit">
                    {row.nro_matricula_cabina}
                </div>
            )
        },
        { 
            header: 'Descripción / Marca', 
            render: (row: UnidadTransporte) => (
                <div className="flex flex-col">
                    <span className="font-bold text-slate-800 uppercase text-xs tracking-wide">{row.descripcion}</span>
                    <span className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">
                        {row.modelo?.marca?.descripcion} - {row.modelo?.descripcion}
                    </span>
                </div>
            )
        },
        { 
            header: 'Capacidad', 
            width: '120px',
            render: (row: UnidadTransporte) => (
                <span className="font-semibold text-slate-600 text-sm">{row.peso_maximo} KG</span>
            )
        },
        { 
            header: 'Estado', 
            className: 'text-center',
            width: '100px',
            render: (row: UnidadTransporte) => (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${row.estado === "1" ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-50 text-red-600 border-red-100'}`}>
                    {row.estado === "1" ? 'ACTIVO' : 'ANULADO'}
                </span>
            )
        },
        { 
            header: 'Acciones', 
            className: 'text-center', 
            width: '140px',
            render: (row: UnidadTransporte) => (
                <div className="flex justify-center gap-1">
                    <button 
                        onClick={() => { setSelected(row); setShowForm(true); }} 
                        className="p-1.5 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded transition-colors"
                        title="Editar"
                    >
                        {row.estado === "1" ? <IconEdit size={18} /> : <IconEye size={18} />}
                    </button>

                    <button 
                        onClick={() => row.unidadtransporteId && handleAction(row.unidadtransporteId, 'anular')} 
                        disabled={row.estado === "0"} 
                        className="p-1.5 hover:bg-orange-50 text-slate-400 hover:text-orange-600 disabled:opacity-30 rounded transition-colors"
                        title="Anular / Dar de Baja"
                    >
                        <IconBan size={18} />
                    </button>

                    <button 
                        onClick={() => row.unidadtransporteId && handleAction(row.unidadtransporteId, 'delete')} 
                        className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded transition-colors"
                        title="Eliminar"
                    >
                        <IconTrash size={18} />
                    </button>
                </div>
            )
        }
    ];

    return (
        <div className="p-6 animate-fade-in-up">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Unidades de Transporte</h1>
                    <p className="text-sm text-slate-500">Gestión de flota vehicular</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => fetchData(meta.currentPage)} className="p-2.5 bg-white border border-slate-300 rounded-lg hover:text-blue-600 shadow-sm transition-all">
                        <IconRefresh size={20} className={loading ? "animate-spin" : ""} />
                    </button>
                    <button onClick={() => { setSelected(null); setShowForm(true); }} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-bold flex items-center gap-2 shadow-lg transition-all active:scale-95">
                        <IconSteeringWheel size={20} /> Nuevo Vehículo
                    </button>
                </div>
            </div>

            {/* Buscador y Botón Filtros */}
            <div className="flex gap-4 mb-4">
                <div className="relative flex-1">
                    <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Buscar por placa, descripción o marca..." 
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl outline-none focus:border-blue-500 transition-all shadow-sm" 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                    />
                </div>
                <button 
                    onClick={handleOpenSidebar} 
                    className={`px-4 py-2.5 rounded-xl font-semibold flex items-center gap-2 border transition-all ${
                        Object.values(filters).flat().length > 0 
                        ? 'bg-blue-50 text-blue-700 border-blue-200' 
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                >
                    <IconFilter size={20} /> 
                    Filtros {Object.values(filters).flat().length > 0 && `(${Object.values(filters).flat().length})`}
                </button>
            </div>

            {/* Tabla */}
            <DataTable columns={columns} data={data} loading={loading} meta={meta} onPageChange={fetchData} />

            {/* Sidebar de Filtros */}
            <SidebarFiltros 
                isOpen={showFilters} 
                onClose={() => setShowFilters(false)} 
                onApply={handleApplyFilters} 
                onClear={() => {
                    const reset = { marca: [], modelo: [] };
                    setTempFilters(reset);
                    setFilters(reset);
                }}
                totalActive={Object.values(tempFilters).flat().length}
            >
                {catalogs ? (
                    <div className="flex flex-col gap-5">
                        <MultiSelect 
                            label="Marcas" 
                            options={catalogs.marca?.map((m: any) => ({ label: m.value, value: String(m.key) }))} 
                            value={tempFilters.marca} 
                            onChange={(v) => setTempFilters({...tempFilters, marca: v, modelo: []})} 
                        />

                        <MultiSelect 
                            label="Modelos" 
                            options={modelosDisponiblesParaFiltro.map((m: any) => ({ label: m.value, value: String(m.key) }))} 
                            value={tempFilters.modelo} 
                            onChange={(v) => setTempFilters({...tempFilters, modelo: v})}
                            placeholder={tempFilters.marca.length === 0 ? "Seleccione marcas primero" : "Todos los modelos"}
                        />
                    </div>
                ) : (
                    <div className="text-center py-10 text-slate-400 italic">Cargando catálogos...</div>
                )}
            </SidebarFiltros>

            {/* Modal */}
            <UnidadFormModal 
                isOpen={showForm} 
                onClose={() => setShowForm(false)} 
                unitToEdit={selected} 
                onSuccess={() => fetchData(meta.currentPage)} 
            />
        </div>
    );
}