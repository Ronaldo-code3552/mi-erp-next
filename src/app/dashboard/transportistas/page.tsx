"use client";
import { useEffect } from "react";
import { useCrud } from "@/hooks/useCrud";
import { useDebounce } from "@/hooks/useDebounce";
import { transportistaService } from "@/services/transportistaService";
import { Transportista } from "@/types/transportista.types";
import DataTable from "@/components/shared/DataTable";
import { IconTruck, IconSearch, IconEdit, IconTrash, IconRefresh } from '@tabler/icons-react';

export default function TransportistasPage() {
    const EMPRESA_ID = "005";
    const { data, loading, meta, searchTerm, setSearchTerm, fetchData, handleAction } = 
        useCrud<Transportista>(transportistaService, EMPRESA_ID);

    const debouncedSearch = useDebounce(searchTerm, 500);

    useEffect(() => { 
        fetchData(1, debouncedSearch); 
    }, [debouncedSearch, fetchData]);

    const columns = [
        { header: 'Documento', render: (row: Transportista) => (
            <div className="flex flex-col">
                <span className="text-[10px] text-slate-400 font-bold uppercase">{row.docidentId}</span>
                <span className="font-mono font-bold text-blue-700">{row.numero_doc}</span>
            </div>
        )},
        { header: 'Razón Social', className: 'min-w-[300px]', render: (row: Transportista) => (
            <p className="font-semibold text-slate-800 uppercase text-xs">{row.descripcion}</p>
        )},
        { header: 'Acciones', className: 'text-center', render: (row: Transportista) => (
            <div className="flex justify-center gap-1">
                <button className="p-1.5 text-slate-400 hover:text-blue-600"><IconEdit size={18} /></button>
                {/* Usamos el ! para evitar el error de ID undefined */}
                <button onClick={() => handleAction(row.transportistaId!, 'delete')} className="p-1.5 text-slate-400 hover:text-red-600"><IconTrash size={18} /></button>
            </div>
        )}
    ];

    return (
        <div className="animate-fade-in-up">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Catálogo de Transportistas</h1>
                    <p className="text-xs text-slate-500">Empresas de transporte registradas</p>
                </div>
                <button className="bg-blue-600 text-white px-4 py-2.5 rounded-lg font-bold flex items-center gap-2 shadow-lg active:scale-95">
                    <IconTruck size={20} /> Nuevo Transportista
                </button>
            </div>
            <div className="relative mb-4">
                <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                    type="text" 
                    placeholder="Buscar por RUC o Razón Social..." 
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl outline-none focus:border-blue-500 transition-all" 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                />
            </div>
            <DataTable columns={columns} data={data} loading={loading} meta={meta} onPageChange={fetchData} />
        </div>
    );
}