// src/app/dashboard/notas-ingreso/page.tsx
"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { format, subDays, parseISO } from 'date-fns'; 
import { toast } from "sonner"; 

import { useCrud } from "@/hooks/useCrud";
import { useDebounce } from "@/hooks/useDebounce";
import { useCatalogs } from "@/hooks/useCatalogs"; 
import { notaIngresoService } from "@/services/notaIngresoService";
import { NotaIngresoResponse } from "@/types/notaIngreso.types";

import DataTable from "@/components/shared/DataTable";
import FiltrosAvanzados from "@/components/filter/FiltrosAvanzados";
import MultiSelect from "@/components/forms/MultiSelect";

import { 
    IconFileInvoice, IconRefresh, IconSearch, IconFilter, 
    IconEye, IconBan, IconPlus, IconPrinter, IconCalendar,
    IconBox, IconUser
} from '@tabler/icons-react';

export default function NotasIngresoPage() {
    const ALMACEN_ID = "001"; // El servicio recibe AlmacenId, no EmpresaId

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const thirtyDaysAgoStr = format(subDays(new Date(), 30), 'yyyy-MM-dd');

    // Mapeo exacto con los filtros que armamos en notaIngresoService.ts
    const initialFilters = { 
        estadoJson: [], 
        transaccionJson: [],
        tipocomercialJson: [],
        monedaJson: [],
        usuarioJson: [],
        fecha_inicio: "", 
        fecha_fin: ""
    };

    // 🚀 Usamos ALMACEN_ID como parámetro para useCrud
    const { 
        data, loading, meta, searchTerm, setSearchTerm, 
        filters, setFilters, fetchData, handleAction 
    } = useCrud<NotaIngresoResponse>(notaIngresoService, ALMACEN_ID, initialFilters);

    const [tempFilters, setTempFilters] = useState<any>(initialFilters);
    const [showFilters, setShowFilters] = useState(false);
    const [printingId, setPrintingId] = useState<string | null>(null);
    const debouncedSearch = useDebounce(searchTerm, 500);

    const EMPRESA_ID = "005"; // Asegúrate de declarar EMPRESA_ID arriba junto a ALMACEN_ID si no lo tienes

    // 🚀 CARGA DE CATÁLOGOS PARA FILTROS AVANZADOS
    const { catalogs, loadingCatalogs } = useCatalogs([
        'TipoDocumentoComercial',
        { endpoint: 'TablaTransacciones', params: { empresaId: EMPRESA_ID } }, // 🚀 CORREGIDO
        'Moneda',
        'CuentaUsuario'
    ]);

    useEffect(() => { 
        fetchData(1, debouncedSearch, filters); 
    }, [debouncedSearch, filters, fetchData]);

    const handleOpenSidebar = () => { setTempFilters(filters); setShowFilters(true); };
    const handleApplyFilters = () => { setFilters(tempFilters); setShowFilters(false); };
    const handleClearFilters = () => { setTempFilters(initialFilters); setFilters(initialFilters); };

    // --- LÓGICA DE IMPRESIÓN ---
    const handlePrint = async (id: string) => {
        setPrintingId(id);
        try {
            // Asumiendo que crearás este método en el service más adelante
            const res = await notaIngresoService.imprimir?.(id); 
            if (res?.isSuccess && res.data?.base64) {
                const byteCharacters = atob(res.data.base64);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i);
                const byteArray = new Uint8Array(byteNumbers);
                const blob = new Blob([byteArray], { type: 'application/pdf' });
                window.open(URL.createObjectURL(blob), '_blank');
                toast.success("Impresión generada.");
            } else {
                toast.error("Error al generar el documento");
            }
        } catch (error: any) {
            toast.error("Error de conexión al intentar imprimir");
        } finally {
            setPrintingId(null);
        }
    };

    // --- COLUMNAS DE LA TABLA (Basadas en tu WebForm) ---
    const columns = [
        { 
            header: 'Documento / Referencia', 
            width: '200px',
            render: (row: NotaIngresoResponse) => (
                <div className="flex flex-col">
                    <span className="font-bold text-slate-800 text-xs truncate" title={row.tipoDocumentoComercial?.descripcion || row.tipodoccomercialId}>
                        {row.tipoDocumentoComercial?.descripcion || row.tipodoccomercialId}
                    </span>
                    <div className="flex items-center gap-1 mt-1">
                        <span className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded text-[10px] font-bold border border-indigo-200" title="Número Referencia">
                            {row.doc_referencia_numero || 'S/N'}
                        </span>
                        {row.doc_referencia && (
                            <span className="text-[9px] text-slate-500 font-medium truncate max-w-[100px]" title="Tipo Referencia">
                                {row.doc_referencia}
                            </span>
                        )}
                    </div>
                </div>
            )
        },
        { 
            header: 'Transacción / Contenedor', 
            width: '200px',
            render: (row: NotaIngresoResponse) => {
                // El Swagger devuelve 'tablaTransacciones' (con 's')
                const transaccionDesc = (row as any).tablaTransacciones?.descripcion || row.transaccionId || 'SIN TRANSACCIÓN';
                return (
                    <div className="flex flex-col gap-1">
                        <span className="text-[11px] font-semibold text-slate-700 leading-tight line-clamp-2" title={transaccionDesc}>
                            {transaccionDesc}
                        </span>
                        {row.nro_contenedor && (
                            <div className="flex items-start gap-1 text-[10px] mt-0.5">
                                <IconBox size={12} className="text-orange-500 mt-0.5" />
                                <span className="text-slate-600 font-mono font-semibold">
                                    Cont: {row.nro_contenedor}
                                </span>
                            </div>
                        )}
                    </div>
                );
            }
        },
        { 
            header: 'Fechas', 
            width: '160px',
            render: (row: NotaIngresoResponse) => (
                <div className="flex flex-col gap-1 text-[10px]">
                    <div className="flex items-center gap-1" title="Fecha Emisión Sistema">
                        <IconCalendar size={12} className="text-blue-500"/> 
                        <span className="text-slate-600">
                            Sis: <span className="font-semibold">{row.fecha_doc ? format(parseISO(row.fecha_doc), 'dd/MM/yyyy HH:mm') : '-'}</span>
                        </span>
                    </div>
                    <div className="flex items-center gap-1" title="Fecha Emisión Manual">
                        <IconCalendar size={12} className="text-emerald-500"/> 
                        <span className="text-slate-600">
                            Man: <span className="font-semibold">{row.fecha_emision ? format(parseISO(row.fecha_emision), 'dd/MM/yyyy HH:mm') : '-'}</span>
                        </span>
                    </div>
                </div>
            )
        },
        { 
            header: 'Responsable', 
            width: '180px',
            render: (row: NotaIngresoResponse) => {
                // Buscamos la observación que suele contener el nombre completo en tu Swagger, sino el usuario
                const nombreResponsable = (row as any).cuentaUsuario?.observacion || row.cuentausuario || 'S/U';
                const perfilDesc = (row as any).cuentaUsuario?.perfil?.descripcion || '';
                
                return (
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                            <IconUser size={14} />
                        </div>
                        <div className="flex flex-col overflow-hidden">
                            <span className="text-[10px] font-bold text-slate-700 truncate" title={nombreResponsable}>
                                {nombreResponsable}
                            </span>
                            {perfilDesc && (
                                <span className="text-[9px] text-slate-400 truncate" title={perfilDesc}>
                                    {perfilDesc}
                                </span>
                            )}
                        </div>
                    </div>
                );
            }
        },
        { 
            header: 'Estado', 
            className: 'text-center',
            width: '110px',
            render: (row: NotaIngresoResponse) => {
                const estado = String(row.estado || '').toUpperCase();
                let badgeClass = "bg-gray-100 text-gray-600 border-gray-200"; // Default
                
                if (estado === "ANULADO") badgeClass = "bg-red-50 text-red-600 border-red-200";
                if (estado === "REGISTRADO") badgeClass = "bg-sky-50 text-sky-600 border-sky-200";
                if (estado === "APROBADO") badgeClass = "bg-emerald-50 text-emerald-600 border-emerald-200";
                if (estado === "COMPROMETIDO") badgeClass = "bg-indigo-50 text-indigo-600 border-indigo-200";
                if (estado === "PENDIENTE") badgeClass = "bg-amber-50 text-amber-600 border-amber-200";

                return (
                    <span className={`px-2.5 py-1 rounded-full text-[9px] tracking-wide font-bold border ${badgeClass}`}>
                        {estado}
                    </span>
                )
            }
        },
        { 
            header: 'Opciones', 
            className: 'text-center', 
            width: '120px',
            render: (row: NotaIngresoResponse) => (
                <div className="flex justify-center gap-1">
                    
                    <Link 
                        href={`/dashboard/notas-ingreso/editar/${row.notasingresosId}`}
                        className="p-1.5 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded transition-colors"
                        title="Ver detalle"
                    >
                        <IconEye size={18} />
                    </Link>

                    <button 
                        onClick={() => handlePrint(row.notasingresosId)} 
                        disabled={printingId === row.notasingresosId}
                        className="p-1.5 hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 disabled:opacity-50 rounded transition-colors"
                        title="Imprimir"
                    >
                        {printingId === row.notasingresosId ? (
                            <IconRefresh size={18} className="animate-spin text-emerald-600" />
                        ) : (
                            <IconPrinter size={18} />
                        )}
                    </button>

                    <button 
                        onClick={() => handleAction(row.notasingresosId, 'anular')} 
                        disabled={String(row.estado || '').toUpperCase() === "ANULADO"} 
                        className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 disabled:opacity-30 rounded transition-colors"
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
            value: x.value 
        })) || [];
    };

    // Filtro Manual de Estados (Como pediste en el prompt)
    const estadoOptions = [
        { value: 'REGISTRADO', label: 'REGISTRADO' },
        { value: 'APROBADO', label: 'APROBADO' },
        { value: 'ANULADO', label: 'ANULADO' },
        { value: 'COMPROMETIDO', label: 'COMPROMETIDO' }
    ];

    return (
        <div className="p-6 animate-fade-in-up">
            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Notas de Ingreso</h1>
                    <p className="text-sm text-slate-500">Listado de ingresos a almacén</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={() => fetchData(meta.currentPage)} className="p-2.5 bg-white border border-slate-300 rounded-lg hover:text-blue-600 shadow-sm transition-all">
                        <IconRefresh size={20} className={loading ? "animate-spin" : ""} />
                    </button>
                    
                    <Link 
                        href="/dashboard/notas-ingreso/crear" 
                        className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-lg font-bold flex items-center gap-2 shadow-lg transition-all active:scale-95"
                    >
                        <IconPlus size={20} /> Nueva Nota
                    </Link>
                </div>
            </div>

            {/* Buscador y Botón Filtros */}
            <div className="flex gap-4 mb-4">
                <div className="relative flex-1">
                    <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Buscar por nro de documento, contenedor o responsable..." 
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
                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1.5">
                                    <span className="text-[10px] text-slate-400 font-bold ml-1">Desde</span>
                                    <input 
                                        type="date" 
                                        className="w-full border border-slate-200 p-2 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-500"
                                        value={tempFilters.fecha_inicio}
                                        onChange={(e) => setTempFilters({...tempFilters, fecha_inicio: e.target.value})}
                                    />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <span className="text-[10px] text-slate-400 font-bold ml-1">Hasta</span>
                                    <input 
                                        type="date" 
                                        className="w-full border border-slate-200 p-2 rounded-lg text-xs outline-none focus:ring-1 focus:ring-blue-500"
                                        value={tempFilters.fecha_fin}
                                        onChange={(e) => setTempFilters({...tempFilters, fecha_fin: e.target.value})}
                                    />
                                </div>
                            </div>
                        </div>

                        <hr className="border-slate-100"/>

                        <MultiSelect label="Estado" options={estadoOptions} value={tempFilters.estadoJson} onChange={(v) => setTempFilters({...tempFilters, estadoJson: v})} />
                        <MultiSelect label="Transacción" options={getOpts('TablaTransacciones')} value={tempFilters.transaccionJson} onChange={(v) => setTempFilters({...tempFilters, transaccionJson: v})} />
                        <MultiSelect label="Tipo Documento" options={getOpts('TipoDocumentoComercial')} value={tempFilters.tipocomercialJson} onChange={(v) => setTempFilters({...tempFilters, tipocomercialJson: v})} />
                        <MultiSelect label="Cuenta Usuario" options={getOpts('CuentaUsuario')} value={tempFilters.usuarioJson} onChange={(v) => setTempFilters({...tempFilters, usuarioJson: v})} />
                    </div>
                )}
            </FiltrosAvanzados>
        </div>
    );
}