// src/app/dashboard/motivo-traslado/page.tsx
"use client";
import { useState, useEffect } from "react";
import { useCrud } from "@/hooks/useCrud";
import { useDebounce } from "@/hooks/useDebounce";
import { motivoTrasladoService } from "@/services/motivoTrasladoService";
import { MotivoTraslado } from "@/types/motivoTraslado.types";

import DataTable from "@/components/shared/DataTable";
import SidebarFiltros from "@/components/filter/FiltrosAvanzados";
import MultiSelect from "@/components/forms/MultiSelect";
import MotivoTrasladoFormModal from "./components/MotivoTrasladoFormModal";

import { 
    IconExchange, IconRefresh, IconSearch, IconFilter, 
    IconEdit, IconBan, IconTrash 
} from '@tabler/icons-react';

export default function MotivoTrasladoPage() {
    
    // Filtros disponibles
    const initialFilters = { 
        cod_sunat: [], 
        estado: [] 
    };

    const { 
        data, loading, meta, searchTerm, setSearchTerm, 
        filters, setFilters, fetchData, handleAction 
    } = useCrud<MotivoTraslado>(motivoTrasladoService, null, initialFilters);

    const [tempFilters, setTempFilters] = useState<any>(initialFilters);
    const [showFilters, setShowFilters] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [selected, setSelected] = useState<MotivoTraslado | null>(null);
    const [catalogs, setCatalogs] = useState<any>(null);

    const debouncedSearch = useDebounce(searchTerm, 500);

    useEffect(() => {
        motivoTrasladoService.getFormDropdowns().then(res => {
            if (res.isSuccess) setCatalogs(res.data);
        });
    }, []);

    useEffect(() => { 
        fetchData(1, debouncedSearch, filters); 
    }, [debouncedSearch, filters, fetchData]);

    // Handlers
    const handleOpenSidebar = () => { setTempFilters(filters); setShowFilters(true); };
    const handleApplyFilters = () => { setFilters(tempFilters); setShowFilters(false); };
    const handleClearFilters = () => { setTempFilters(initialFilters); setFilters(initialFilters); };

    // Columnas Actualizadas
    const columns = [
        { 
            header: 'Descripción', 
            render: (row: MotivoTraslado) => (
                <div className="flex flex-col">
                    <span className="font-bold text-slate-800 text-xs">{row.descripcion}</span>
                    <span className="text-[10px] text-slate-400">{row.sunatCatalogo?.descripcion || '-'}</span>
                </div>
            )
        },
        { 
            header: 'Cód. SUNAT', 
            width: '100px',
            className: 'text-center',
            render: (row: MotivoTraslado) => (
                <span className="font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                    {row.COD_SUNAT}
                </span>
            )
        },
        { 
            header: 'Estado', 
            className: 'text-center',
            width: '100px',
            render: (row: MotivoTraslado) => (
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${row.estado ? 'bg-green-50 text-green-700 border-green-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
                    {row.estado ? 'ACTIVO' : 'INACTIVO'}
                </span>
            )
        },
        { 
            header: 'Acciones', 
            className: 'text-center', 
            width: '140px',
            render: (row: MotivoTraslado) => (
                <div className="flex justify-center gap-1">
                    <button onClick={() => { setSelected(row); setShowForm(true); }} className="p-1.5 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded transition-colors"><IconEdit size={18} /></button>
                    <button onClick={() => handleAction(row.motivotrasladoId!, 'anular')} disabled={!row.estado} className="p-1.5 hover:bg-orange-50 text-slate-400 hover:text-orange-600 disabled:opacity-30 rounded"><IconBan size={18} /></button>
                    <button onClick={() => handleAction(row.motivotrasladoId!, 'delete')} className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded"><IconTrash size={18} /></button>
                </div>
            )
        }
    ];

    return (
        <div className="p-6 animate-fade-in-up">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Motivos de Traslado</h1>
                    <p className="text-sm text-slate-500">Catálogo de motivos SUNAT</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => fetchData(meta.currentPage)} className="p-2.5 bg-white border border-slate-300 rounded-lg hover:text-blue-600 shadow-sm"><IconRefresh size={20} className={loading ? "animate-spin" : ""} /></button>
                    <button onClick={() => { setSelected(null); setShowForm(true); }} className="bg-slate-900 text-white px-4 py-2.5 rounded-lg font-bold flex items-center gap-2 shadow-lg active:scale-95 text-xs"><IconExchange size={18} /> Nuevo Motivo</button>
                </div>
            </div>

            <div className="flex gap-4 mb-4">
                <div className="relative flex-1">
                    <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Buscar por descripción..." 
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl outline-none focus:border-blue-500 transition-all shadow-sm" 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                    />
                </div>
                <button onClick={handleOpenSidebar} className={`px-4 py-2.5 rounded-xl font-semibold flex items-center gap-2 border transition-all text-xs ${Object.values(filters).flat().length > 0 ? 'bg-blue-50 text-blue-700 border-blue-200' : 'bg-white text-slate-700 border-slate-300'}`}>
                    <IconFilter size={18} /> Filtros
                </button>
            </div>

            <DataTable columns={columns} data={data} loading={loading} meta={meta} onPageChange={fetchData} />

            <SidebarFiltros 
                isOpen={showFilters} onClose={() => setShowFilters(false)} 
                onApply={handleApplyFilters} onClear={handleClearFilters}
                totalActive={Object.values(tempFilters).flat().length}
            >
                {catalogs ? (
                    <div className="flex flex-col gap-5">
                        <MultiSelect label="Estado" options={catalogs.estado?.map((x:any) => ({label: x.value, value: x.key})) || []} value={tempFilters.estado} onChange={(v) => setTempFilters({...tempFilters, estado: v})} />
                        
                        {/* Se mantiene SUNAT si el endpoint form-dropdowns aún lo trae, si no, remover */}
                        <MultiSelect 
                            label="Código SUNAT" 
                            options={catalogs.codSunat?.map((x: any) => ({ label: `${x.key} - ${x.value}`, value: x.key })) || []} 
                            value={tempFilters.cod_sunat} 
                            onChange={(v) => setTempFilters({...tempFilters, cod_sunat: v})} 
                        />
                    </div>
                ) : <div className="text-center py-10 text-slate-400 italic">Cargando...</div>}
            </SidebarFiltros>

            <MotivoTrasladoFormModal isOpen={showForm} onClose={() => setShowForm(false)} onSuccess={() => fetchData(meta.currentPage)} dataToEdit={selected} />
        </div>
    );
}