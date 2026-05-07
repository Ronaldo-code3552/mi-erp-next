// src/app/dashboard/reportes/page.tsx
"use client";
import { useEffect, useMemo, useState } from 'react';
import {
    IconBuildingWarehouse,
    IconCalendarStats,
    IconChartBar,
    IconChevronDown,
    IconClipboardList,
    IconFileSpreadsheet,
    IconLoader,
    IconPackages,
    IconRoute,
    IconX
} from '@tabler/icons-react';
import SearchableSelect from '@/components/forms/SearchableSelect';
import apiClient from '@/api/apiCliente';
import { reporteService } from '@/services/reporteService';
import { useCatalogs } from '@/hooks/useCatalogs';
import { getAlmacenesActivosOrdenados, getTipoAlmacenId } from '@/utils/almacenOptions';
import { SelectOption } from '@/types/catalog.types';

type TipoAlmacenApi = { tipoalmacenId: number; descripcion: string; estado: string; };

type DateRangeValue = {
    desdeFecha: string;
    hastaFecha: string;
};

type ReportActionId =
    | 'stock'
    | 'kardex'
    | 'p_ventas'
    | 'p_compras'
    | 'p_guiasout'
    | 'p_guiasin'
    | 'v_mes'
    | 'v_sede'
    | 'm_det'
    | 'm_tras'
    | 'm_dist'
    | 'r_inv'
    | 'r_kard'
    | 'r_prod';

type ReportSubItem = {
    id: ReportActionId;
    title: string;
    description: string;
};

type ReportListItem = {
    id: string;
    title: string;
    description: string;
    icon: React.ReactNode;
    accentClass: string;
    iconClass: string;
    modalClass: string;
    buttonClass: string;
    actionId?: ReportActionId;
    children?: ReportSubItem[];
};

const dateInputClass = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-50";

function DateRangeFields<T extends DateRangeValue>({ value, onChange }: { value: T; onChange: (next: T) => void }) {
    return (
        <div className="grid grid-cols-2 gap-2">
            <div className="flex flex-col gap-1.5">
                <label className="ml-1 text-[10px] font-bold uppercase text-slate-500">Desde</label>
                <input
                    type="date"
                    className={dateInputClass}
                    value={value.desdeFecha}
                    onChange={(e) => onChange({ ...value, desdeFecha: e.target.value })}
                />
            </div>
            <div className="flex flex-col gap-1.5">
                <label className="ml-1 text-[10px] font-bold uppercase text-slate-500">Hasta</label>
                <input
                    type="date"
                    className={dateInputClass}
                    value={value.hastaFecha}
                    onChange={(e) => onChange({ ...value, hastaFecha: e.target.value })}
                />
            </div>
        </div>
    );
}

function DownloadButton({
    label,
    reportId,
    loading,
    disabled,
    colorClass,
    onClick
}: {
    label: string;
    reportId: string;
    loading: string | null;
    disabled?: boolean;
    colorClass: string;
    onClick: () => void;
}) {
    const isLoading = loading === reportId;

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled || Boolean(loading)}
            className={`flex min-h-11 w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold text-white shadow-sm transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none ${colorClass}`}
        >
            {isLoading ? <IconLoader size={18} className="animate-spin" /> : <IconFileSpreadsheet size={18} />}
            <span className="truncate">{isLoading ? 'Generando Excel...' : label}</span>
        </button>
    );
}

export default function ReportesPage() {
    const empresaId = "005";

    const [loading, setLoading] = useState<string | null>(null);
    const [activeAction, setActiveAction] = useState<ReportActionId | null>(null);
    const [expandedGroup, setExpandedGroup] = useState<string | null>('pendientes');

    const [stockParams, setStockParams] = useState({ tipoAlmacen: "0", almacenId: "000", tipoReporte: "1" });
    const [tipoAlmacenOptions, setTipoAlmacenOptions] = useState<SelectOption[]>([{ value: "0", label: "TODOS LOS TIPOS" }]);

    const [kardexParams, setKardexParams] = useState({ tipo: "ADMINISTRATIVO", almacenId: "000", desdeFecha: "", hastaFecha: "" });
    const [pendientesParams, setPendientesParams] = useState({ desdeFecha: "", hastaFecha: "" });
    const [ventasParams, setVentasParams] = useState({ sedeId: "000", incluyeDocsInternos: false, desdeFecha: "", hastaFecha: "" });
    const [movimientosParams, setMovimientosParams] = useState({ almacenId: "000", desdeFecha: "", hastaFecha: "" });
    const [maestrosParams, setMaestrosParams] = useState({ almacenId: "000", transaccionId: "0", desdeFecha: "", hastaFecha: "" });

    const { catalogs, loadingCatalogs } = useCatalogs([{ endpoint: 'Almacen', params: { empresaId } }]);
    const almacenesOrdenados = useMemo(() => getAlmacenesActivosOrdenados(catalogs['Almacen'] || []), [catalogs]);

    const almacenOptions = useMemo<SelectOption[]>(() => [
        { value: "000", label: "TODOS LOS ALMACENES" },
        ...almacenesOrdenados
    ], [almacenesOrdenados]);

    const stockAlmacenOptions = useMemo<SelectOption[]>(() => {
        const tipoSeleccionado = Number(stockParams.tipoAlmacen);
        const almacenesFiltrados = tipoSeleccionado > 0
            ? almacenesOrdenados.filter((a) => getTipoAlmacenId(a) === tipoSeleccionado)
            : almacenesOrdenados;

        return [{ value: "000", label: "TODOS LOS ALMACENES" }, ...almacenesFiltrados];
    }, [almacenesOrdenados, stockParams.tipoAlmacen]);

    useEffect(() => {
        let isMounted = true;

        const fetchTiposAlmacen = async () => {
            try {
                const response = await apiClient.get('/TipoAlmacen');
                const data = Array.isArray(response.data?.data) ? response.data.data as TipoAlmacenApi[] : [];
                const opciones = data
                    .filter((item) => String(item.estado || '').trim().toLowerCase() === 'activo')
                    .map((item) => ({ value: String(item.tipoalmacenId), label: item.descripcion }));

                if (isMounted) setTipoAlmacenOptions([{ value: "0", label: "TODOS LOS TIPOS" }, ...opciones]);
            } catch (error) {
                console.error("Error cargando tipos:", error);
            }
        };

        fetchTiposAlmacen();
        return () => { isMounted = false; };
    }, []);

    const reportItems = useMemo<ReportListItem[]>(() => [
        {
            id: 'stock',
            actionId: 'stock',
            title: 'Stocks por Almacén',
            description: 'Existencias por tipo, almacén y unidad de presentación.',
            icon: <IconBuildingWarehouse size={22} />,
            accentClass: 'border-l-blue-500',
            iconClass: 'bg-blue-50 text-blue-700 border-blue-100',
            modalClass: 'bg-blue-600',
            buttonClass: 'bg-blue-600 hover:bg-blue-700'
        },
        {
            id: 'kardex',
            actionId: 'kardex',
            title: 'Kardex Valorizado',
            description: 'Detalle valorizado por tipo, almacén y rango de fechas.',
            icon: <IconCalendarStats size={22} />,
            accentClass: 'border-l-orange-500',
            iconClass: 'bg-orange-50 text-orange-700 border-orange-100',
            modalClass: 'bg-orange-600',
            buttonClass: 'bg-orange-600 hover:bg-orange-700'
        },
        {
            id: 'pendientes',
            title: 'Documentos Pendientes',
            description: 'Despachos, compras y guías pendientes de atención.',
            icon: <IconClipboardList size={22} />,
            accentClass: 'border-l-teal-500',
            iconClass: 'bg-teal-50 text-teal-700 border-teal-100',
            modalClass: 'bg-teal-600',
            buttonClass: 'bg-teal-600 hover:bg-teal-700',
            children: [
                { id: 'p_ventas', title: 'Ventas salida', description: 'Ventas pendientes de despacho.' },
                { id: 'p_compras', title: 'Compras ingreso', description: 'Compras pendientes de ingreso.' },
                { id: 'p_guiasout', title: 'Guías salida', description: 'Guías pendientes de salida.' },
                { id: 'p_guiasin', title: 'Guías ingreso', description: 'Guías pendientes de ingreso.' }
            ]
        },
        {
            id: 'ventas',
            title: 'Análisis de Ventas',
            description: 'Ventas por sede y rotación comercial en kardex.',
            icon: <IconChartBar size={22} />,
            accentClass: 'border-l-purple-500',
            iconClass: 'bg-purple-50 text-purple-700 border-purple-100',
            modalClass: 'bg-purple-600',
            buttonClass: 'bg-purple-600 hover:bg-purple-700',
            children: [
                { id: 'v_mes', title: 'Ventas kardex', description: 'Rotación de ventas por mes.' },
                { id: 'v_sede', title: 'Ventas sede', description: 'Reporte consolidado por sede.' }
            ]
        },
        {
            id: 'movimientos',
            title: 'Movimientos y Rutas',
            description: 'Rotación detallada, traslados y distribución por transporte.',
            icon: <IconRoute size={22} />,
            accentClass: 'border-l-amber-500',
            iconClass: 'bg-amber-50 text-amber-700 border-amber-100',
            modalClass: 'bg-amber-600',
            buttonClass: 'bg-amber-600 hover:bg-amber-700',
            children: [
                { id: 'm_det', title: 'Rotación detallada', description: 'Movimientos detallados por almacén.' },
                { id: 'm_tras', title: 'Traslados almacén', description: 'Traslados entre almacenes.' },
                { id: 'm_dist', title: 'Dist. transporte', description: 'Distribución por transporte.' }
            ]
        },
        {
            id: 'maestros',
            title: 'Maestros e Inventario',
            description: 'Productos, transacciones de kardex y rotación de inventario.',
            icon: <IconPackages size={22} />,
            accentClass: 'border-l-rose-500',
            iconClass: 'bg-rose-50 text-rose-700 border-rose-100',
            modalClass: 'bg-rose-600',
            buttonClass: 'bg-rose-600 hover:bg-rose-700',
            children: [
                { id: 'r_inv', title: 'Rotación inventario', description: 'Rotación del inventario por fecha.' },
                { id: 'r_kard', title: 'Trans. kardex', description: 'Transacciones de kardex por almacén.' },
                { id: 'r_prod', title: 'Lista productos', description: 'Maestro de bienes/productos.' }
            ]
        }
    ], []);

    const activeMeta = useMemo(() => {
        for (const item of reportItems) {
            if (item.actionId === activeAction) return { ...item, actionId: item.actionId };
            const subItem = item.children?.find((child) => child.id === activeAction);
            if (subItem) {
                return {
                    ...item,
                    actionId: subItem.id,
                    title: subItem.title,
                    description: subItem.description
                };
            }
        }
        return null;
    }, [activeAction, reportItems]);

    const handleDownload = async (reportName: ReportActionId, serviceCall: () => Promise<void>) => {
        try {
            setLoading(reportName);
            await serviceCall();
        } catch (error) {
            console.error(`Error al descargar ${reportName}:`, error);
        } finally {
            setLoading(null);
        }
    };

    const handleActionDownload = (action: ReportActionId) => {
        const actions: Record<ReportActionId, () => Promise<void>> = {
            stock: () => reporteService.descargarStockExcel({
                empresaId,
                tipoAlmacen: Number(stockParams.tipoAlmacen),
                almacenId: stockParams.almacenId,
                tipoReporte: stockParams.tipoReporte
            }),
            kardex: () => reporteService.descargarKardexExcel({ empresaId, ...kardexParams }),
            p_ventas: () => reporteService.descargarVentasPendientes({ empresaId, ...pendientesParams }),
            p_compras: () => reporteService.descargarComprasPendientes({ empresaId, ...pendientesParams }),
            p_guiasout: () => reporteService.descargarGuiasSalida({ empresaId, ...pendientesParams }),
            p_guiasin: () => reporteService.descargarGuiasIngreso({ empresaId, ...pendientesParams }),
            v_mes: () => reporteService.descargarVentasMes({ empresaId, ...ventasParams }),
            v_sede: () => reporteService.descargarVentasSede({ empresaId, ...ventasParams }),
            m_det: () => reporteService.descargarRotacionDetallada(movimientosParams),
            m_tras: () => reporteService.descargarTrasladosAlmacen(movimientosParams),
            m_dist: () => reporteService.descargarDistribucionTransporte(movimientosParams),
            r_inv: () => reporteService.descargarRotacionInventario({
                empresaId,
                desdeFecha: maestrosParams.desdeFecha,
                hastaFecha: maestrosParams.hastaFecha
            }),
            r_kard: () => reporteService.descargarTransaccionesKardex({ empresaId, ...maestrosParams }),
            r_prod: () => reporteService.descargarListaProductos(empresaId)
        };

        return handleDownload(action, actions[action]);
    };

    const isActionDisabled = (action: ReportActionId) => {
        if (action === 'stock') return loadingCatalogs;
        if (action === 'kardex') return loadingCatalogs || !kardexParams.desdeFecha || !kardexParams.hastaFecha;
        return false;
    };

    const renderDrawerContent = () => {
        if (!activeAction) return null;

        if (activeAction === 'stock') {
            return (
                <>
                    <SearchableSelect
                        label="Tipo Almacén"
                        name="tipoAlmacen"
                        value={stockParams.tipoAlmacen}
                        options={tipoAlmacenOptions}
                        onChange={(e) => setStockParams({ ...stockParams, tipoAlmacen: String(e.target.value), almacenId: "000" })}
                    />
                    <SearchableSelect
                        label="Almacén"
                        name="almacenId"
                        value={stockParams.almacenId}
                        options={stockAlmacenOptions}
                        disabled={loadingCatalogs}
                        placeholder={loadingCatalogs ? "Cargando almacenes..." : "Seleccione almacén"}
                        onChange={(e) => setStockParams({ ...stockParams, almacenId: String(e.target.value) })}
                    />
                    <SearchableSelect
                        label="Agrupado por"
                        name="tipoReporte"
                        value={stockParams.tipoReporte}
                        options={[{ value: "1", label: "POR UNIDAD MÍNIMA" }, { value: "2", label: "POR PRESENTACIÓN" }]}
                        onChange={(e) => setStockParams({ ...stockParams, tipoReporte: String(e.target.value) })}
                    />
                </>
            );
        }

        if (activeAction === 'kardex') {
            return (
                <>
                    <SearchableSelect
                        label="Tipo"
                        name="tipo"
                        value={kardexParams.tipo}
                        options={[{ value: "ADMINISTRATIVO", label: "ADMINISTRATIVO" }, { value: "CONTABLE", label: "CONTABLE" }]}
                        onChange={(e) => setKardexParams({ ...kardexParams, tipo: String(e.target.value) })}
                    />
                    <SearchableSelect
                        label="Almacén"
                        name="almacenId"
                        value={kardexParams.almacenId}
                        options={almacenOptions}
                        disabled={loadingCatalogs}
                        placeholder={loadingCatalogs ? "Cargando almacenes..." : "Seleccione almacén"}
                        onChange={(e) => setKardexParams({ ...kardexParams, almacenId: String(e.target.value) })}
                    />
                    <DateRangeFields value={kardexParams} onChange={setKardexParams} />
                </>
            );
        }

        if (['p_ventas', 'p_compras', 'p_guiasout', 'p_guiasin'].includes(activeAction)) {
            return <DateRangeFields value={pendientesParams} onChange={setPendientesParams} />;
        }

        if (['v_mes', 'v_sede'].includes(activeAction)) {
            return (
                <>
                    <SearchableSelect
                        label="Sede"
                        name="sedeId"
                        value={ventasParams.sedeId}
                        options={[{ value: "000", label: "TODAS LAS SEDES" }]}
                        onChange={(e) => setVentasParams({ ...ventasParams, sedeId: String(e.target.value) })}
                    />
                    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700">
                        <input
                            type="checkbox"
                            checked={ventasParams.incluyeDocsInternos}
                            onChange={(e) => setVentasParams({ ...ventasParams, incluyeDocsInternos: e.target.checked })}
                            className="rounded border-slate-300 text-purple-600"
                        />
                        Incluir documentos internos
                    </label>
                    <DateRangeFields value={ventasParams} onChange={setVentasParams} />
                </>
            );
        }

        if (['m_det', 'm_tras', 'm_dist'].includes(activeAction)) {
            return (
                <>
                    <SearchableSelect
                        label="Almacén"
                        name="almacenId"
                        value={movimientosParams.almacenId}
                        options={almacenOptions}
                        disabled={loadingCatalogs}
                        placeholder={loadingCatalogs ? "Cargando almacenes..." : "Seleccione almacén"}
                        onChange={(e) => setMovimientosParams({ ...movimientosParams, almacenId: String(e.target.value) })}
                    />
                    <DateRangeFields value={movimientosParams} onChange={setMovimientosParams} />
                </>
            );
        }

        if (['r_inv', 'r_kard', 'r_prod'].includes(activeAction)) {
            if (activeAction === 'r_prod') {
                return (
                    <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600">
                        Este reporte descarga el maestro completo de productos de la empresa.
                    </p>
                );
            }

            return (
                <>
                    {activeAction === 'r_kard' && (
                        <>
                            <SearchableSelect
                                label="Almacén"
                                name="almacenId"
                                value={maestrosParams.almacenId}
                                options={almacenOptions}
                                disabled={loadingCatalogs}
                                placeholder={loadingCatalogs ? "Cargando almacenes..." : "Seleccione almacén"}
                                onChange={(e) => setMaestrosParams({ ...maestrosParams, almacenId: String(e.target.value) })}
                            />
                            <SearchableSelect
                                label="Tipo Transacción"
                                name="transaccionId"
                                value={maestrosParams.transaccionId}
                                options={[{ value: "0", label: "TODAS LAS TRANSACCIONES" }]}
                                onChange={(e) => setMaestrosParams({ ...maestrosParams, transaccionId: String(e.target.value) })}
                            />
                        </>
                    )}
                    <DateRangeFields value={maestrosParams} onChange={setMaestrosParams} />
                </>
            );
        }

        return null;
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                    <div className="mb-2 text-sm text-slate-500">
                        <span>Módulo Inventario Almacén</span> / <span className="font-bold text-slate-700">Reportes</span>
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-800">Centro de Reportes</h1>
                    <p className="mt-1 max-w-2xl text-sm text-slate-500">
                        Seleccione un reporte para configurar filtros y generar el Excel.
                    </p>
                </div>

                {loading && (
                    <div className="flex items-center gap-2 rounded-lg border border-blue-100 bg-white px-3 py-2 text-xs font-semibold text-blue-700 shadow-sm">
                        <IconLoader size={16} className="animate-spin" />
                        Preparando archivo...
                    </div>
                )}
            </div>

            <div className="max-w-5xl space-y-3">
                {reportItems.map((item) => {
                    const isExpanded = expandedGroup === item.id;
                    const isSingleActive = item.actionId && activeAction === item.actionId;
                    const hasActiveChild = item.children?.some((child) => child.id === activeAction);

                    return (
                        <section
                            key={item.id}
                            className={`overflow-hidden rounded-xl border border-l-4 bg-white shadow-sm transition hover:border-slate-300 hover:shadow-md ${item.accentClass} ${isSingleActive || hasActiveChild ? 'ring-2 ring-blue-100' : 'border-slate-200'}`}
                        >
                            <button
                                type="button"
                                onClick={() => item.children ? setExpandedGroup(isExpanded ? null : item.id) : setActiveAction(item.actionId || null)}
                                className="flex w-full items-center gap-3 px-4 py-4 text-left"
                            >
                                <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border ${item.iconClass}`}>
                                    {item.icon}
                                </div>
                                <div className="min-w-0 flex-1">
                                    <h2 className="text-sm font-bold uppercase tracking-wide text-slate-800">{item.title}</h2>
                                    <p className="mt-0.5 text-xs text-slate-500">{item.description}</p>
                                </div>
                                {item.children ? (
                                    <IconChevronDown size={20} className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                ) : (
                                    <span className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50">
                                        Configurar
                                    </span>
                                )}
                            </button>

                            {item.children && isExpanded && (
                                <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-3">
                                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                                        {item.children.map((child) => (
                                            <button
                                                key={child.id}
                                                type="button"
                                                onClick={() => setActiveAction(child.id)}
                                                className={`rounded-lg border bg-white px-3 py-3 text-left transition hover:border-slate-300 hover:shadow-sm ${activeAction === child.id ? 'border-blue-200 ring-2 ring-blue-100' : 'border-slate-200'}`}
                                            >
                                                <span className="block text-xs font-bold uppercase text-slate-800">{child.title}</span>
                                                <span className="mt-1 block text-xs text-slate-500">{child.description}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </section>
                    );
                })}
            </div>

            <div
                className={`fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 transition-opacity ${activeAction ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
                onClick={() => setActiveAction(null)}
            >
                <div
                    role="dialog"
                    aria-modal="true"
                    className={`flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-xl bg-white shadow-2xl transition-all duration-200 ${activeAction ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}
                    onClick={(event) => event.stopPropagation()}
                >
                    <div className={`${activeMeta?.modalClass || 'bg-blue-600'} px-5 py-5 text-white`}>
                        <div className="flex items-start gap-3">
                            {activeMeta && (
                                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-white/25 bg-white/15 text-white shadow-sm">
                                    {activeMeta.icon}
                                </div>
                            )}
                            <div className="min-w-0 flex-1">
                                <h3 className="text-base font-bold uppercase tracking-wide text-white">
                                    {activeMeta?.title || 'Reporte'}
                                </h3>
                                <p className="mt-1 text-xs leading-relaxed text-white/85">
                                    {activeMeta?.description || 'Configure filtros y genere el archivo.'}
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setActiveAction(null)}
                                className="rounded-lg p-2 text-white/80 transition hover:bg-white/15 hover:text-white"
                            >
                                <IconX size={20} />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 space-y-4 overflow-y-auto bg-white px-5 py-5">
                        {renderDrawerContent()}
                    </div>

                    <div className="border-t border-slate-100 bg-white px-5 py-4">
                        {activeAction && activeMeta && (
                            <DownloadButton
                                label="Generar Excel"
                                reportId={activeAction}
                                loading={loading}
                                colorClass={activeMeta.buttonClass}
                                disabled={isActionDisabled(activeAction)}
                                onClick={() => handleActionDownload(activeAction)}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
