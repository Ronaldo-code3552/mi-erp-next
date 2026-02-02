"use client";
import { useEffect } from "react";
import { useCrud } from "@/hooks/useCrud";
import { useDebounce } from "@/hooks/useDebounce";
import { unidadTransporteService } from "@/services/unidadTransporteService";
import { UnidadTransporte } from "@/types/unidadTransporte.types";
import DataTable from "@/components/shared/DataTable";
import { IconSteeringWheel, IconSearch, IconEdit, IconTrash } from '@tabler/icons-react';

export default function UnidadTransportePage() {
    const EMPRESA_ID = "005";
    const { data, loading, meta, searchTerm, setSearchTerm, fetchData, handleAction } = 
        useCrud<UnidadTransporte>(unidadTransporteService, EMPRESA_ID);

    const debouncedSearch = useDebounce(searchTerm, 500);

    useEffect(() => { 
        fetchData(1, debouncedSearch); 
    }, [debouncedSearch, fetchData]);

    const columns = [
        { header: 'Placa', render: (row: UnidadTransporte) => (
            <div className="bg-slate-800 text-white px-2 py-1 rounded text-xs font-bold font-mono border border-slate-600 w-fit shadow-sm">
                {row.nro_matricula_cabina}
            </div>
        )},
        { header: 'Descripción / Marca', render: (row: UnidadTransporte) => (
            <div className="flex flex-col">
                <span className="font-semibold text-slate-800 uppercase text-xs">{row.descripcion}</span>
                <span className="text-[10px] text-slate-400 font-bold uppercase">{row.modelo?.marca?.descripcion}</span>
            </div>
        )},
        { header: 'Capacidad', render: (row: UnidadTransporte) => (
            <span className="font-bold text-slate-600">{row.peso_maximo} KG</span>
        )},
        { header: 'Acciones', className: 'text-center', render: (row: UnidadTransporte) => (
            <div className="flex justify-center gap-1">
                <button className="p-1.5 text-slate-400 hover:text-blue-600"><IconEdit size={18} /></button>
                <button onClick={() => handleAction(row.unidadtransporteId!, 'delete')} className="p-1.5 text-slate-400 hover:text-red-600"><IconTrash size={18} /></button>
            </div>
        )}
    ];

    // ... (El resto del JSX es idéntico al patrón anterior)
    return (
        <div className="animate-fade-in-up">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Unidades de Transporte</h1>
                <button className="bg-blue-600 text-white px-4 py-2.5 rounded-lg font-bold flex items-center gap-2 shadow-lg active:scale-95">
                    <IconSteeringWheel size={20} /> Nuevo Vehículo
                </button>
            </div>
            <div className="relative mb-4">
                <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                    type="text" 
                    placeholder="Buscar por placa..." 
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl outline-none focus:border-blue-500 transition-all" 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                />
            </div>
            <DataTable columns={columns} data={data} loading={loading} meta={meta} onPageChange={fetchData} />
        </div>
    );
}