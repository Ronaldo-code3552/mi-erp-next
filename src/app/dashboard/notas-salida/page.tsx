// src/app/dashboard/notas-salida/page.tsx
"use client";
import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { format, subDays, parseISO } from 'date-fns'; 
import { toast } from "sonner"; 
import Swal from 'sweetalert2';

import { useCrud } from "@/hooks/useCrud";
import { useDebounce } from "@/hooks/useDebounce";
import { useCatalogs } from "@/hooks/useCatalogs"; 
import { notaSalidaService } from "@/services/notaSalidaService"; // 🚀 Asumimos que crearás este servicio
import { NotaSalidaResponse } from "@/types/notaSalida.types"; // 🚀 Asumimos que crearás este tipo

import DataTable from "@/components/shared/DataTable";
import FiltrosAvanzados from "@/components/filter/FiltrosAvanzados";
import MultiSelect from "@/components/forms/MultiSelect";
import SearchableSelect from "@/components/forms/SearchableSelect";

import { 
    IconFileExport, IconRefresh, IconSearch, IconFilter, 
    IconEye, IconBan, IconPlus, IconPrinter, IconCalendar,
    IconUser, IconFileExcel, IconBuildingStore
} from '@tabler/icons-react';

export default function NotasSalidaPage() {
    const EMPRESA_ID = "005";
    const USER_NAME = "BIOSNET";

    const initialFilters = { 
        estadoJson: [], 
        transaccionJson: [],
        fecha_inicio: format(subDays(new Date(), 30), 'yyyy-MM-dd'), 
        fecha_fin: format(new Date(), 'yyyy-MM-dd')
    };

    const [selectedAlmacenId, setSelectedAlmacenId] = useState("");

    const { 
        data, loading, meta, searchTerm, setSearchTerm, 
        filters, setFilters, fetchData 
    } = useCrud<NotaSalidaResponse>(notaSalidaService, selectedAlmacenId, initialFilters);

    const [tempFilters, setTempFilters] = useState<any>(initialFilters);
    const [showFilters, setShowFilters] = useState(false);
    const [printingId, setPrintingId] = useState<string | null>(null);
    const debouncedSearch = useDebounce(searchTerm, 500);

    // 🚀 CARGA DE CATÁLOGOS BASE (Aplicando tu nueva arquitectura)
    const { catalogs, loadingCatalogs } = useCatalogs([
        { endpoint: 'Almacen', params: { empresaId: EMPRESA_ID } },
        ...(selectedAlmacenId
            ? [{ endpoint: 'TablaTransaccionesPerfil', params: { cuentausuarioId: USER_NAME, almacenId: selectedAlmacenId } }]
            : [])
    ]);

    const almacenOptions = useMemo(() => {
        return (catalogs['Almacen'] || []).filter((a: any) => {
            const estado = a?.originalData?.estado ?? a?.estado;
            return estado === true || estado === 1 || estado === '1';
        });
    }, [catalogs]);

    // 🧠 FILTRO RECREADO DE WEBFORMS PARA TIPO DE TRANSACCIÓN (Salidas)
    const transaccionOptions = useMemo(() => {
        let opciones = catalogs['TablaTransaccionesPerfil'] || [];
        // 1. Solo movimientos de Salida (tipomovimientoId == "S")
        // 2. Excluir explícitamente "DP" como en el WebForm
        return opciones.filter((t: any) => 
            t.originalData?.tipomovimientoId === "S" && t.value !== "DP"
        );
    }, [catalogs]);

    useEffect(() => { 
        if (!selectedAlmacenId) return;
        fetchData(1, debouncedSearch, filters); 
    }, [debouncedSearch, filters, fetchData, selectedAlmacenId]);

    const handleAlmacenChange = (e: any) => {
        const value = String(e?.target?.value || '').trim();
        setSelectedAlmacenId(value);
        setSearchTerm("");
        setTempFilters(initialFilters);
        setFilters(initialFilters);
    };

    const handleOpenSidebar = () => { setTempFilters(filters); setShowFilters(true); };
    const handleApplyFilters = () => { setFilters(tempFilters); setShowFilters(false); };
    const handleClearFilters = () => { setTempFilters(initialFilters); setFilters(initialFilters); };

    // --- LÓGICA DE ANULACIÓN CON REGLA DE NEGOCIO ---
    const handleAnularNota = async (row: any) => {
        const id = row.notassalidaId;
        const estado = String(row.estado || '').toUpperCase();
        const transaccion = row.transaccionId;

        // 🚀 REGLA DE NEGOCIO HEREDADA DEL WEBFORM
        if (transaccion === "TE" && estado === "COMPROMETIDO") {
            toast.error("¡No se puede anular la NOTA! Solicite la anulación de la nota de ingreso en el almacén de llegada.", { duration: 6000 });
            return;
        }

        const result = await Swal.fire({
            title: '¿Anular nota de salida?',
            html: '<span style="color: grey; font-size: 14px;">La anulación de este documento actualizará el saldo en el kardex.</span>',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, Anular',
            confirmButtonColor: '#ef4444', // red-500
        });

        if (!result.isConfirmed) return;

        try {
            const res = await notaSalidaService.anular(id, EMPRESA_ID);
            if (res.isSuccess) {
                toast.success(res.message || 'Nota de Salida anulada correctamente');
                fetchData(meta.currentPage);
            } else {
                toast.error(res.message || 'No se pudo anular la nota');
            }
        } catch (error: any) {
            toast.error(error?.message || 'Error de conexión al anular');
        }
    };

    // --- LÓGICA DE IMPRESIÓN ---
    const handlePrint = async (id: string) => {
        setPrintingId(id);
        try {
            const res = await notaSalidaService.imprimir?.(id); 
            if (res?.isSuccess && res.data?.base64) {
                const byteCharacters = atob(res.data.base64);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i);
                const blob = new Blob([new Uint8Array(byteNumbers)], { type: 'application/pdf' });
                window.open(URL.createObjectURL(blob), '_blank');
                toast.success("Documento generado.");
            } else {
                toast.error("Error al generar el PDF");
            }
        } catch (error: any) {
            toast.error("Error de conexión al imprimir");
        } finally {
            setPrintingId(null);
        }
    };

    const handleExportExcel = () => {
        toast.info("Generando Excel... (Conectando con el servicio exportExcel)");
        // notaSalidaService.exportarExcel(selectedAlmacenId, filters);
    };

    const columns = [
        { 
            header: 'Transacción / Documento', 
            width: '250px',
            render: (row: any) => {
                const transaccionDesc = row.transaccionDesc || row.tablaTransacciones?.descripcion || row.transaccionId || 'SIN TRANSACCIÓN';
                return (
                    <div className="flex flex-col gap-1">
                        <span className="font-bold text-slate-800 text-xs truncate" title={transaccionDesc}>
                            {transaccionDesc}
                        </span>
                        <div className="flex items-center gap-1 mt-0.5">
                            <span className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded text-[10px] font-bold border border-indigo-200">
                                {row.tipodoccomercialDesc || row.tipodoccomercialId || 'DOC'}
                            </span>
                            <span className="text-[10px] text-slate-500 font-mono font-medium">
                                {row.observaciones || row.doc_referencia_numero || 'S/N'}
                            </span>
                        </div>
                    </div>
                );
            }
        },
        { 
            header: 'Cliente / Destino', 
            width: '220px',
            render: (row: any) => {
                const clienteDesc = row.CuentasusuarioId || row.cliente?.descripcion || row.clienteDesc || 'Sin especificar';
                return (
                    <div className="flex items-start gap-1.5">
                        <IconFileExport size={16} className="text-slate-400 mt-0.5 shrink-0" />
                        <span className="text-[11px] font-semibold text-slate-700 leading-tight line-clamp-2" title={clienteDesc}>
                            {clienteDesc}
                        </span>
                    </div>
                );
            }
        },
        { 
            header: 'Fecha Emisión', 
            width: '140px',
            render: (row: any) => (
                <div className="flex items-center gap-1.5 text-[11px]">
                    <IconCalendar size={14} className="text-blue-500"/> 
                    <span className="text-slate-700 font-medium">
                        {row.fecha_emision ? format(parseISO(row.fecha_emision), 'dd/MM/yyyy HH:mm') : '-'}
                    </span>
                </div>
            )
        },
        { 
            header: 'Responsable', 
            width: '180px',
            render: (row: any) => {
                const nombreResponsable = row.NombreUsuario || row.cuentaUsuario?.observacion || row.cuentausuario || 'S/U';
                return (
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 shrink-0">
                            <IconUser size={14} />
                        </div>
                        <span className="text-[10px] font-bold text-slate-700 truncate" title={nombreResponsable}>
                            {nombreResponsable}
                        </span>
                    </div>
                );
            }
        },
        { 
            header: 'Estado', 
            className: 'text-center',
            width: '110px',
            render: (row: any) => {
                const estado = String(row.estado || '').toUpperCase();
                let badgeClass = "bg-gray-100 text-gray-600 border-gray-200"; // Default
                
                if (estado === "ANULADO") badgeClass = "bg-red-50 text-red-600 border-red-200";
                if (estado === "REGISTRADO") badgeClass = "bg-sky-50 text-sky-600 border-sky-200";
                if (estado === "COMPROMETIDO") badgeClass = "bg-blue-50 text-blue-600 border-blue-200";
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
            render: (row: any) => (
                <div className="flex justify-center gap-1">
                    <Link 
                        href={`/dashboard/notas-salida/editar/${row.notassalidaId}`}
                        className="p-1.5 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded transition-colors"
                        title="Ver detalle"
                    >
                        <IconEye size={18} />
                    </Link>

                    <button 
                        onClick={() => handlePrint(row.notassalidaId)} 
                        disabled={printingId === row.notassalidaId}
                        className="p-1.5 hover:bg-emerald-50 text-slate-400 hover:text-emerald-600 disabled:opacity-50 rounded transition-colors"
                        title="Imprimir"
                    >
                        {printingId === row.notassalidaId ? (
                            <IconRefresh size={18} className="animate-spin text-emerald-600" />
                        ) : (
                            <IconPrinter size={18} />
                        )}
                    </button>

                    <button 
                        onClick={() => handleAnularNota(row)} 
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

    const estadoOptions = [
        { value: 'REGISTRADO', label: 'REGISTRADO' },
        { value: 'PENDIENTE', label: 'PENDIENTE' },
        { value: 'COMPROMETIDO', label: 'COMPROMETIDO' },
        { value: 'ANULADO', label: 'ANULADO' }
    ];

    return (
        <div className="p-6 animate-fade-in-up">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 tracking-tight">Notas de Salida</h1>
                    <p className="text-sm text-slate-500">Listado de despachos y salidas de almacén</p>
                </div>
                <div className="flex gap-2">
                    <button onClick={handleExportExcel} className="p-2.5 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-lg hover:bg-emerald-100 shadow-sm transition-all" title="Exportar a Excel">
                        <IconFileExcel size={20} />
                    </button>
                    <button
                        onClick={() => selectedAlmacenId && fetchData(meta.currentPage)}
                        disabled={!selectedAlmacenId}
                        className="p-2.5 bg-white border border-slate-300 rounded-lg hover:text-blue-600 shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Refrescar"
                    >
                        <IconRefresh size={20} className={loading ? "animate-spin" : ""} />
                    </button>
                    <Link 
                        href="/dashboard/notas-salida/crear" 
                        className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-lg font-bold flex items-center gap-2 shadow-lg transition-all active:scale-95"
                    >
                        <IconPlus size={20} /> Nueva Salida
                    </Link>
                </div>
            </div>

            <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                        <IconBuildingStore size={22} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="mb-3">
                            <h2 className="text-sm font-bold text-slate-800">Contexto de Almacén</h2>
                            <p className="text-xs text-slate-500">
                                Seleccione el almacén desde el cual desea consultar las notas de salida.
                            </p>
                        </div>

                        <div className="max-w-xl">
                            <SearchableSelect
                                label="Almacén Origen (Local) *"
                                name="almacenId"
                                options={almacenOptions}
                                value={selectedAlmacenId}
                                onChange={handleAlmacenChange}
                                placeholder="Seleccione un almacén para consultar"
                            />
                        </div>

                        <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-500">
                            <span className={`inline-block h-2.5 w-2.5 rounded-full ${selectedAlmacenId ? 'bg-emerald-500' : 'bg-amber-400'}`} />
                            {selectedAlmacenId
                                ? 'Almacén seleccionado. La tabla y los filtros ya están trabajando con este contexto.'
                                : 'Primero elija un almacén para habilitar la consulta y los filtros del listado.'}
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex gap-4 mb-4">
                <div className="relative flex-1">
                    <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                        type="text" 
                        placeholder="Buscar por nro de documento, cliente o producto..." 
                        className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl outline-none focus:border-blue-500 transition-all shadow-sm text-sm disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed" 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                        disabled={!selectedAlmacenId}
                    />
                </div>
                <button 
                    onClick={handleOpenSidebar} 
                    disabled={!selectedAlmacenId}
                    className={`px-4 py-2.5 rounded-xl font-semibold flex items-center gap-2 border transition-all text-sm ${
                        Object.values(filters).some(v => (Array.isArray(v) && v.length > 0) || (typeof v === 'string' && v !== ""))
                        ? 'bg-blue-50 text-blue-700 border-blue-200' 
                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                    <IconFilter size={20} /> Filtros Avanzados
                </button>
            </div>

            {!selectedAlmacenId ? (
                <div className="bg-white border border-slate-200 rounded-xl p-10 text-center text-slate-500">
                    Seleccione un almacén para consultar las notas de salida.
                </div>
            ) : (
                <DataTable columns={columns} data={data} loading={loading} meta={meta} onPageChange={fetchData} />
            )}

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
                                <IconCalendar size={14}/> Período
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

                        <MultiSelect 
                            label="Transacción" 
                            options={transaccionOptions.map((t:any) => ({ value: t.value, label: t.label }))} 
                            value={tempFilters.transaccionJson} 
                            onChange={(v) => setTempFilters({...tempFilters, transaccionJson: v})} 
                        />
                        <MultiSelect 
                            label="Estado" 
                            options={estadoOptions} 
                            value={tempFilters.estadoJson} 
                            onChange={(v) => setTempFilters({...tempFilters, estadoJson: v})} 
                        />
                    </div>
                )}
            </FiltrosAvanzados>
        </div>
    );
}
