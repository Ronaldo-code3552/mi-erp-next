// src/app/dashboard/guias-remision/page.tsx
"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { format, subDays } from 'date-fns'; 
import { toast } from "sonner"; 

import { useCrud } from "@/hooks/useCrud";
import { useDebounce } from "@/hooks/useDebounce";
import { guiaRemisionService } from "@/services/guiaRemisionService";
import { useCatalogs } from "@/hooks/useCatalogs"; // 🚀 NUESTRO HOOK MÁGICO
import { GuiaRemisionResponse } from "@/types/guiaRemision.types";

import DataTable from "@/components/shared/DataTable";
import FiltrosAvanzados from "@/components/filter/FiltrosAvanzados";
import MultiSelect from "@/components/forms/MultiSelect";

import { 
    IconFileInvoice, IconRefresh, IconSearch, IconFilter, 
    IconEye, IconBan, IconPlus, IconTruckDelivery, IconMapPin, IconCalendar,
    IconPrinter 
} from '@tabler/icons-react';

export default function GuiasRemisionPage() {
    const EMPRESA_ID = "005";
    // const ALMACEN_ID = "001"; // Ya no se necesita en el listado global

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const thirtyDaysAgoStr = format(subDays(new Date(), 30), 'yyyy-MM-dd');

    const initialFilters = { 
        estadoJson: [], 
        tipoMovimientoJson: [],
        tipocomercialJson: [],
        AlmacenInicioJson: [],
        AlmacenDestinoJson: [],
        monedaJson: [],
        motivoTasladoJson: [],
        trabajadorJson: [],
        puntoVentaJson: [],
        transportistaJson: [],
        unidadTransporteJson: [],
        conductorJson: [],
        fecha_inicio: "", 
        fecha_fin: ""
    };

    const { 
        data, loading, meta, searchTerm, setSearchTerm, 
        filters, setFilters, fetchData, handleAction 
    } = useCrud<GuiaRemisionResponse>(guiaRemisionService, EMPRESA_ID, initialFilters);

    const [tempFilters, setTempFilters] = useState<any>(initialFilters);
    const [showFilters, setShowFilters] = useState(false);
    const [printingId, setPrintingId] = useState<string | null>(null);
    const debouncedSearch = useDebounce(searchTerm, 500);

    // 🚀 MAGIA: Reemplazamos el SP Tóxico con las llamadas a los microservicios
    const { catalogs, loadingCatalogs } = useCatalogs([
        'EstadoGuiasRemision',
        'TipoMovimiento',
        'TipoDocumentoComercial',
        'Moneda',
        'MotivoTraslado',
        { endpoint: 'Almacen', params: { empresaId: EMPRESA_ID } },
        { endpoint: 'Punto_Venta', params: { empresaId: EMPRESA_ID } },
        { endpoint: 'Trabajador', params: { empresaId: EMPRESA_ID } },
        { endpoint: 'Transportista', params: { empresaId: EMPRESA_ID } },
        { endpoint: 'UnidadTransporte', params: { empresaId: EMPRESA_ID } },
        { endpoint: 'ConductorTransporte', params: { empresaId: EMPRESA_ID } }
    ]);

    useEffect(() => { 
        fetchData(1, debouncedSearch, filters); 
    }, [debouncedSearch, filters, fetchData]);

    const handleOpenSidebar = () => { setTempFilters(filters); setShowFilters(true); };
    const handleApplyFilters = () => { setFilters(tempFilters); setShowFilters(false); };
    const handleClearFilters = () => { setTempFilters(initialFilters); setFilters(initialFilters); };
    // --- NUEVA LÓGICA DE IMPRESIÓN ---
    const handlePrint = async (id: string) => {
        setPrintingId(id);
        try {
            const res = await guiaRemisionService.imprimir(id);
            
            if (res.isSuccess && res.data?.base64) {
                // 1. Decodificar el Base64
                const byteCharacters = atob(res.data.base64);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                
                // 2. Crear un archivo (Blob) tipo PDF
                const blob = new Blob([byteArray], { type: 'application/pdf' });
                
                // 3. Crear una URL temporal para el archivo
                const fileUrl = URL.createObjectURL(blob);
                
                // 4. Abrir en una nueva pestaña (El navegador mostrará su propio visor PDF)
                window.open(fileUrl, '_blank');
                
                // Mensaje opcional informando el tipo de formato generado
                if(res.data.esFormatoSunat){
                    toast.success("Impresión formato SUNAT generada.");
                } else {
                    toast.success("Impresión interna (Ticket) generada.");
                }
            } else {
                toast.error(res.message || "Error al generar el documento");
            }
        } catch (error: any) {
            console.error("Error al imprimir:", error);
            // Mostrar el mensaje de error que viene del backend (ej: "no se encontró el PDF de MiFact")
            toast.error(error?.response?.data?.message || "Error de conexión al intentar imprimir");
        } finally {
            setPrintingId(null);
        }
    };

    // --- COLUMNAS DE LA TABLA ---
    const columns = [
        { 
            header: 'Emisión / Guía', 
            width: '140px',
            render: (row: GuiaRemisionResponse) => (
                <div className="flex flex-col">
                    <span className="text-xs font-semibold text-slate-700">
                        {row.fecha_emision ? format(new Date(row.fecha_emision), 'dd/MM/yyyy') : '-'}
                    </span>
                    <div className="flex items-center gap-1 mt-1">
                        <span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded text-[10px] font-bold font-mono border border-blue-200">
                            {row.serie}-{row.correlativo}
                        </span>
                    </div>
                </div>
            )
        },
        { 
            header: 'Cliente / Motivo', 
            width: '250px',
            render: (row: GuiaRemisionResponse) => (
                <div className="flex flex-col">
                    <p className="font-bold text-slate-800 text-xs truncate max-w-[240px]" title={row.cliente?.descripcion}>
                        {row.cliente?.descripcion}
                    </p>
                    <span className="text-[10px] text-slate-500 flex items-center gap-1">
                        <IconFileInvoice size={12}/> {row.cliente?.docidentId}: {row.cliente?.num_docident}
                    </span>
                    <span className="text-[10px] text-purple-600 font-semibold bg-purple-50 px-1 rounded w-fit mt-0.5">
                        {row.motivoTraslado?.descripcion}
                    </span>
                </div>
            )
        },
        { 
            header: 'Ruta (Inicio -> Destino)', 
            render: (row: GuiaRemisionResponse) => (
                <div className="flex flex-col gap-1">
                    <div className="flex items-start gap-1 text-[10px]">
                        <IconMapPin size={12} className="text-green-600 mt-0.5" />
                        <span className="text-slate-600 leading-tight line-clamp-1" title={row.punto_partida}>
                             {row.almacenInicio?.descripcion || 'Partida'}
                        </span>
                    </div>
                    <div className="flex items-start gap-1 text-[10px]">
                        <IconMapPin size={12} className="text-red-600 mt-0.5" />
                        <span className="text-slate-600 leading-tight line-clamp-1" title={row.punto_llegada}>
                             {row.almacenDestino?.descripcion || 'Llegada'}
                        </span>
                    </div>
                </div>
            )
        },
        { 
            header: 'Transporte', 
            width: '200px',
            render: (row: GuiaRemisionResponse) => (
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                        <IconTruckDelivery size={18} />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-slate-700 truncate max-w-[150px]">
                            {row.transportista?.descripcion || row.conductor?.nombres + ' ' + row.conductor?.apellidos}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                            {row.unidadTransporte?.nro_matricula_cabina || 'S/PLACA'}
                        </span>
                    </div>
                </div>
            )
        },
        { 
            header: 'Estado', 
            className: 'text-center',
            width: '100px',
            render: (row: GuiaRemisionResponse) => {
                const isAnulado = row.estado === "ANULADO";
                return (
                    <div className="flex flex-col gap-1 items-center">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${isAnulado ? 'bg-red-50 text-red-600 border-red-100' : 'bg-green-50 text-green-700 border-green-100'}`}>
                            {row.estado}
                        </span>
                        {/* ESTADO SUNAT (Badges según código) */}
                        {row.estado_documento_sunat && (
                             <span className={`px-2 py-0.5 rounded text-[9px] font-bold font-mono ${
                                 row.estado_documento_sunat === '0' || row.estado_documento_sunat === '102' ? 'bg-blue-100 text-blue-700' : 
                                 row.estado_documento_sunat === '103' ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-600'
                             }`}>
                                SUNAT: {row.estado_documento_sunat}
                             </span>
                        )}
                    </div>
                )
            }
        },
        { 
            header: 'Acciones', 
            className: 'text-center', 
            width: '160px', // <-- Aumentamos el ancho para que quepan 3 botones
            render: (row: GuiaRemisionResponse) => (
                <div className="flex justify-center gap-1">
                    
                    {/* BOTÓN IMPRIMIR AÑADIDO */}
                    <button 
                        onClick={() => handlePrint(row.guiasremisionId)} 
                        disabled={printingId === row.guiasremisionId}
                        className="p-1.5 hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 disabled:opacity-50 rounded transition-colors"
                        title="Imprimir PDF"
                    >
                        {printingId === row.guiasremisionId ? (
                            <IconRefresh size={18} className="animate-spin text-emerald-600" />
                        ) : (
                            <IconPrinter size={18} />
                        )}
                    </button>

                    <Link 
                        href={`/dashboard/guias-remision/editar/${row.guiasremisionId}`}
                        className="p-1.5 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded transition-colors"
                        title="Ver detalle / Editar"
                    >
                        <IconEye size={18} />
                    </Link>

                    <button 
                        onClick={() => handleAction(row.guiasremisionId, 'anular')} 
                        disabled={row.estado === "ANULADO"} 
                        className="p-1.5 hover:bg-orange-50 text-slate-400 hover:text-orange-600 disabled:opacity-30 rounded transition-colors"
                        title="Anular"
                    >
                        <IconBan size={18} />
                    </button>
                </div>
            )
        }
    ];

    const getOpts = (catalogName: string) => {
        return catalogs?.[catalogName]?.map((x: any) => ({ 
            label: x.label || x.value || String(x.key) || "-", 
            value: x.value // Por defecto usamos el ID
        })) || [];
    };
    const getEstadoOpts = () => {
        return catalogs?.['EstadoGuiasRemision']?.map((x: any) => ({
            label: x.label,
            value: x.label // <- ¡AQUÍ ESTÁ LA MAGIA! Enviará 'ANULADO' al backend
        })) || [];
    };

    return (
        <div className="p-6 animate-fade-in-up">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Guías de Remisión</h1>
                    <p className="text-sm text-slate-500">Gestión de traslados y envíos SUNAT</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => fetchData(meta.currentPage)} className="p-2.5 bg-white border border-slate-300 rounded-lg hover:text-blue-600 shadow-sm transition-all">
                        <IconRefresh size={20} className={loading ? "animate-spin" : ""} />
                    </button>
                    
                    <Link 
                        href="/dashboard/guias-remision/crear" 
                        className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-lg font-bold flex items-center gap-2 shadow-lg transition-all active:scale-95"
                    >
                        <IconPlus size={20} /> Nueva Guía
                    </Link>
                </div>
            </div>

            {/* Buscador y Botón Filtros */}
            <div className="flex gap-4 mb-4">
                <div className="relative flex-1">
                    <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Buscar por serie, número, cliente o transportista..." 
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl outline-none focus:border-blue-500 transition-all shadow-sm" 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                    />
                </div>
                <button 
                    onClick={handleOpenSidebar} 
                    className={`px-4 py-2.5 rounded-xl font-semibold flex items-center gap-2 border transition-all ${
                        Object.values(filters).some(v => (Array.isArray(v) && v.length > 0) || (typeof v === 'string' && v !== ""))
                        ? 'bg-blue-50 text-blue-700 border-blue-200' 
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    }`}
                >
                    <IconFilter size={20} /> 
                    Filtros Avanzados
                </button>
            </div>

            {/* Tabla */}
            <DataTable columns={columns} data={data} loading={loading} meta={meta} onPageChange={fetchData} />

            {/* Sidebar Filtros */}
            <FiltrosAvanzados 
                isOpen={showFilters} 
                onClose={() => setShowFilters(false)} 
                onApply={handleApplyFilters} 
                onClear={handleClearFilters}
                totalActive={Object.values(tempFilters).flat().filter(Boolean).length}
            >
                {loadingCatalogs ? (
                    <div className="text-center py-10 text-slate-400 italic">Cargando filtros...</div>
                ) : (
                    <div className="flex flex-col gap-6">
                        <div className="space-y-3">
                            <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1">
                                <IconCalendar size={14}/> Rango de Fechas
                            </label>
                            {/* ... Inputs de fechas intactos ... */}
                        </div>

                        <hr className="border-slate-100"/>

                        {/* 🚀 ACTUALIZADO: Ahora apuntamos a los nombres reales de los endpoints */}
                        <MultiSelect label="Estado" options={getEstadoOpts()} value={tempFilters.estadoJson} onChange={(v) => setTempFilters({...tempFilters, estadoJson: v})} />
                        <MultiSelect label="Tipo Movimiento" options={getOpts('TipoMovimiento')} value={tempFilters.tipoMovimientoJson} onChange={(v) => setTempFilters({...tempFilters, tipoMovimientoJson: v})} />
                        <MultiSelect label="Almacén Inicio" options={getOpts('Almacen')} value={tempFilters.AlmacenInicioJson} onChange={(v) => setTempFilters({...tempFilters, AlmacenInicioJson: v})} />
                        <MultiSelect label="Almacén Destino" options={getOpts('Almacen')} value={tempFilters.AlmacenDestinoJson} onChange={(v) => setTempFilters({...tempFilters, AlmacenDestinoJson: v})} />
                        <MultiSelect label="Motivo Traslado" options={getOpts('MotivoTraslado')} value={tempFilters.motivoTasladoJson} onChange={(v) => setTempFilters({...tempFilters, motivoTasladoJson: v})} />
                        <MultiSelect label="Transportista" options={getOpts('Transportista')} value={tempFilters.transportistaJson} onChange={(v) => setTempFilters({...tempFilters, transportistaJson: v})} placeholder="Buscar transportista..." />
                        <MultiSelect label="Conductor" options={getOpts('ConductorTransporte')} value={tempFilters.conductorJson} onChange={(v) => setTempFilters({...tempFilters, conductorJson: v})} placeholder="Buscar conductor..." />
                        <MultiSelect label="Unidad Transporte" options={getOpts('UnidadTransporte')} value={tempFilters.unidadTransporteJson} onChange={(v) => setTempFilters({...tempFilters, unidadTransporteJson: v})} placeholder="Buscar placa..." />
                        <MultiSelect label="Punto de Venta" options={getOpts('PuntoVenta')} value={tempFilters.puntoVentaJson} onChange={(v) => setTempFilters({...tempFilters, puntoVentaJson: v})} />
                    </div>
                )}
            </FiltrosAvanzados>
        </div>
    );
}
