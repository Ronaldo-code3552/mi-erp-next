"use client";
import { useEffect, useState } from "react";
import { useCrud } from "@/hooks/useCrud";
import { useDebounce } from "@/hooks/useDebounce"; // Importado
import { conductorService } from "@/services/conductorService";
import { Conductor } from "@/types/conductor.types";
import DataTable from "@/components/shared/DataTable";
import { IconUserPlus, IconRefresh, IconSearch, IconEdit, IconTrash } from '@tabler/icons-react';

export default function ConductoresPage() {
    const EMPRESA_ID = "005";
    const { data, loading, meta, searchTerm, setSearchTerm, fetchData, handleAction } = 
        useCrud<Conductor>(conductorService, EMPRESA_ID);

    // Aplicamos el debounce al término de búsqueda
    const debouncedSearch = useDebounce(searchTerm, 500);

    // useEffect depende ahora de debouncedSearch
    useEffect(() => { 
        fetchData(1, debouncedSearch); 
    }, [debouncedSearch, fetchData]);

    const columns = [
        { header: 'Documento', render: (row: Conductor) => (
            <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 font-bold uppercase">{row.docidentId}</span>
                <span className="font-mono font-bold text-blue-700">{row.nro_documento}</span>
            </div>
        )},
        { header: 'Conductor', className: 'min-w-[250px]', render: (row: Conductor) => (
            <p className="font-semibold text-slate-800 uppercase text-xs">{row.apellidos}, {row.nombres}</p>
        )},
        { header: 'Acciones', className: 'text-center', render: (row: Conductor) => (
            <div className="flex justify-center gap-1">
                <button className="p-1.5 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded transition-colors"><IconEdit size={18} /></button>
                <button 
                    onClick={() => row.conductortransporteId && handleAction(row.conductortransporteId, 'delete')} 
                    className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded transition-colors"
                    >
                    <IconTrash size={18} />
                </button>
            </div>
        )}
    ];

    return (
        <div className="animate-fade-in-up">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-slate-800">Maestro de Conductores</h1>
                <div className="flex gap-2">
                    <button onClick={() => fetchData(meta.currentPage)} className="p-2.5 bg-white border border-slate-300 rounded-lg hover:text-blue-600 shadow-sm"><IconRefresh size={20} className={loading ? "animate-spin" : ""} /></button>
                    <button className="bg-blue-600 text-white px-4 py-2.5 rounded-lg font-bold flex items-center gap-2 shadow-lg active:scale-95"><IconUserPlus size={20} /> Nuevo Conductor</button>
                </div>
            </div>
            <div className="relative mb-4">
                <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                    type="text" 
                    placeholder="Buscar por nombre o DNI..." 
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl outline-none focus:border-blue-500 transition-all" 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                />
            </div>
            <DataTable columns={columns} data={data} loading={loading} meta={meta} onPageChange={fetchData} />
        </div>
    );
}