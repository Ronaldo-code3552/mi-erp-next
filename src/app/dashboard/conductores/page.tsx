// src/app/dashboard/conductores/page.tsx
"use client";
import { useState, useEffect } from "react";
import { useCrud } from "@/hooks/useCrud";
import { useDebounce } from "@/hooks/useDebounce";
import { conductorService } from "@/services/conductorService";
import { Conductor } from "@/types/conductor.types";

import DataTable from "@/components/shared/DataTable";
import SidebarFiltros from "@/components/filter/FiltrosAvanzados"; // Asegúrate de que la ruta sea correcta según tu estructura
import MultiSelect from "@/components/forms/MultiSelect";
import ConductorFormModal from "./components/ConductorFormModal";

import { 
    IconUserPlus, IconRefresh, IconSearch, IconFilter, 
    IconEdit, IconBan, IconAddressBook, IconTrash 
} from '@tabler/icons-react';

export default function ConductoresPage() {
    const EMPRESA_ID = "005";
    
    const initialFilters = { documento_identidad: [] };

    const { 
        data, loading, meta, searchTerm, setSearchTerm, 
        filters, setFilters, fetchData, handleAction 
    } = useCrud<Conductor>(conductorService, EMPRESA_ID, initialFilters);

    // Estados Locales
    const [tempFilters, setTempFilters] = useState<any>(initialFilters);
    const [showFilters, setShowFilters] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [selected, setSelected] = useState<Conductor | null>(null);
    const [catalogs, setCatalogs] = useState<any>(null);

    const debouncedSearch = useDebounce(searchTerm, 500);

    // Cargar catálogos al inicio
    useEffect(() => {
        conductorService.getFormDropdowns().then(res => {
            if (res.isSuccess) setCatalogs(res.data);
        });
    }, []);

    // Fetch data cuando cambian búsqueda o filtros
    useEffect(() => {
        fetchData(1, debouncedSearch, filters);
    }, [debouncedSearch, filters, fetchData]);

    // Manejadores de Filtros
    const handleOpenSidebar = () => {
        setTempFilters(filters);
        setShowFilters(true);
    };

    const handleApplyFilters = () => {
        setFilters(tempFilters);
        setShowFilters(false);
    };

    const handleClearFilters = () => {
        setTempFilters(initialFilters);
        setFilters(initialFilters);
    };

    // Definición de Columnas (Idéntica a React)
    const columns = [
        { 
            header: 'Documento', 
            width: '120px',
            render: (row: Conductor) => (
                <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">
                        {row.documento_identidad?.descripcion_corta || row.docidentId || 'DOC'}
                    </span>
                    <span className="font-mono font-bold text-blue-700">{row.nro_documento}</span>
                </div>
            )
        },
        { 
            header: 'Conductor / Licencia', 
            className: 'min-w-[250px]',
            render: (row: Conductor) => (
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                        <IconAddressBook size={18} />
                    </div>
                    <div>
                        <p className="font-semibold text-slate-800 uppercase text-xs">
                            {row.apellidos}, {row.nombres}
                        </p>
                        <p className="text-[10px] text-slate-500 uppercase font-medium">
                            {row.licencia_conducir ? `Licencia: ${row.licencia_conducir}` : 'Sin Licencia'}
                        </p>
                    </div>
                </div>
            )
        },
        { 
            header: 'Estado', 
            className: 'text-center',
            width: '100px',
            render: (row: Conductor) => (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${row.estado ? 'bg-green-100 text-green-700 border-green-200' : 'bg-red-50 text-red-600 border-red-100'}`}>
                    {row.estado ? 'ACTIVO' : 'ANULADO'}
                </span>
            )
        },
        {
            header: 'Acciones',
            className: 'text-center',
            width: '140px',
            render: (row: Conductor) => (
                <div className="flex justify-center gap-1">
                    <button 
                        onClick={() => { setSelected(row); setShowForm(true); }} 
                        className="p-1.5 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded transition-colors"
                        title="Editar"
                    >
                        <IconEdit size={18} />
                    </button>
                    
                    <button 
                        onClick={() => row.conductortransporteId && handleAction(row.conductortransporteId, 'anular')} 
                        disabled={!row.estado} 
                        className="p-1.5 hover:bg-orange-50 text-slate-400 hover:text-orange-600 disabled:opacity-30 rounded transition-colors"
                        title="Anular / Dar de Baja"
                    >
                        <IconBan size={18} />
                    </button>
                    
                    <button 
                        onClick={() => row.conductortransporteId && handleAction(row.conductortransporteId, 'delete')} 
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
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Maestro de Conductores</h1>
                    <p className="text-sm text-slate-500">Gestión de choferes y licencias</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => fetchData(meta.currentPage)} className="p-2.5 bg-white border border-slate-300 rounded-lg hover:text-blue-600 shadow-sm transition-colors">
                        <IconRefresh size={20} className={loading ? "animate-spin" : ""} />
                    </button>
                    <button onClick={() => { setSelected(null); setShowForm(true); }} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg font-bold flex items-center gap-2 shadow-lg transition-all active:scale-95">
                        <IconUserPlus size={20} /> Nuevo Conductor
                    </button>
                </div>
            </div>

            {/* Barra de Búsqueda y Filtros */}
            <div className="flex gap-4 mb-4">
                <div className="relative flex-1">
                    <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Buscar por nombres, apellidos o número de documento..."
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl outline-none focus:border-blue-500 transition-all"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <button 
                    onClick={handleOpenSidebar}
                    className={`px-4 py-2.5 rounded-xl font-semibold flex items-center gap-2 border transition-all ${
                        Object.values(filters).flat().length > 0 ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white border-slate-300'
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
                onClear={handleClearFilters}
                totalActive={Object.values(tempFilters).flat().length}
            >
                {catalogs ? (
                    <div className="flex flex-col gap-5">
                        <MultiSelect 
                            label="Tipo de Documento" 
                            options={catalogs.documento_identidad?.map((t: any) => ({ label: t.aux || t.value, value: t.key }))}
                            value={tempFilters.documento_identidad}
                            onChange={(vals) => setTempFilters({...tempFilters, documento_identidad: vals})}
                        />
                    </div>
                ) : (
                    <div className="text-center py-10 text-slate-400 italic text-sm">Cargando catálogos...</div>
                )}
            </SidebarFiltros>

            {/* Modal Formulario */}
            <ConductorFormModal 
                isOpen={showForm} 
                onClose={() => setShowForm(false)} 
                conductorToEdit={selected}
                onSuccess={() => fetchData(meta.currentPage)}
            />
        </div>
    );
}