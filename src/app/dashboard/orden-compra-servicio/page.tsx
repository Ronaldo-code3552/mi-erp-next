"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import { toast } from "sonner";
import {
    IconBuildingStore,
    IconCircleCheck,
    IconCirclePlus,
    IconEdit,
    IconEye,
    IconFilter,
    IconBan,
    IconPrinter,
    IconRefresh,
    IconSearch
} from "@tabler/icons-react";

import FiltrosAvanzados from "@/components/filter/FiltrosAvanzados";
import MultiSelect from "@/components/forms/MultiSelect";
import DataTable from "@/components/shared/DataTable";
import { useCrud } from "@/hooks/useCrud";
import { useDebounce } from "@/hooks/useDebounce";
import { monedaService } from "@/services/monedaService";
import { ordenCompraServicioService } from "@/services/ordenCompraServicioService";
import { proveedorService } from "@/services/proveedorService";
import { tipoOrdenService } from "@/services/tipoOrdenService";
import { OrdenCompraServicio, OrdenCompraServicioFilters } from "@/types/ordenCompraServicio.types";

type Option = {
    value: string | number;
    label: string;
};

const initialFilters: OrdenCompraServicioFilters = {
    estado: [],
    tipoOrden: [],
    proveedorId: [],
    monedaId: [],
    fechaInicio: "",
    fechaFin: ""
};

const estadoOptions = [
    { value: "REGISTRADO", label: "REGISTRADO" },
    { value: "PENDIENTE", label: "PENDIENTE" },
    { value: "APROBADO", label: "APROBADO" },
    { value: "COMPROMETIDO", label: "COMPROMETIDO" },
    { value: "ANULADO", label: "ANULADO" }
];

const formatDate = (value?: string | null) => {
    if (!value) return "-";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";

    return date.toLocaleDateString("es-PE");
};

const formatMoney = (value: unknown) => {
    const parsed = Number(value ?? 0);
    return new Intl.NumberFormat("es-PE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(Number.isFinite(parsed) ? parsed : 0);
};

const getValue = (row: OrdenCompraServicio, keys: string[]) => {
    const raw = row as Record<string, unknown>;

    for (const key of keys) {
        const value = raw[key];
        if (value !== null && value !== undefined && String(value).trim() !== "") {
            return value;
        }
    }

    return "";
};

const getString = (row: OrdenCompraServicio, keys: string[]) => {
    const value = getValue(row, keys);
    return value === null || value === undefined ? "" : String(value).trim();
};

const getOrdenId = (row: OrdenCompraServicio) => {
    return getString(row, ["ordenCompraServicioId", "ordencompraservicioId", "OrdenCompraServicioId", "ordencompraservicio_id"]);
};

const getNumeroOrden = (row: OrdenCompraServicio) => {
    return getString(row, ["numeroOrdenCompra", "numero_ordencompra", "NumeroOrdenCompra"]) || getOrdenId(row) || "-";
};

const getEstado = (row: OrdenCompraServicio) => {
    return getString(row, ["estado", "Estado"]) || "REGISTRADO";
};

const getTipoOrden = (row: OrdenCompraServicio) => {
    const tipoOrden = row.tipoOrden;

    if (typeof tipoOrden === "object" && tipoOrden?.descripcion) return tipoOrden.descripcion;
    if (row.TipoOrden && typeof row.TipoOrden === "object" && row.TipoOrden.descripcion) return row.TipoOrden.descripcion;

    return row.tipoOrdenDetalle?.descripcion ||
        row.TipoOrdenDetalle?.descripcion ||
        "Sin tipo";
};

const getProveedor = (row: OrdenCompraServicio) => {
    return row.proveedor?.descripcion ||
        row.Proveedor?.descripcion ||
        "Sin proveedor";
};

const getProveedorDoc = (row: OrdenCompraServicio) => {
    const proveedor = row.proveedor || row.Proveedor;
    const docType = proveedor?.docidentId || proveedor?.tipoDocumento || "";
    const docNumber = proveedor?.numero_doc || proveedor?.numeroDoc || "";

    return [docType, docNumber].filter(Boolean).join(" ");
};

const getMoneda = (row: OrdenCompraServicio) => {
    return row.moneda?.descripcion ||
        row.Moneda?.descripcion ||
        row.moneda?.simbolomoneda ||
        row.Moneda?.simbolomoneda ||
        "Sin moneda";
};

const getMonedaSymbol = (row: OrdenCompraServicio) => {
    return row.moneda?.simbolomoneda ||
        row.Moneda?.simbolomoneda ||
        row.moneda?.simbolo ||
        row.Moneda?.simbolo ||
        "S/";
};

const getTipoPago = (row: OrdenCompraServicio) => {
    return row.tipoPago?.descripcion ||
        row.TipoPago?.descripcion ||
        "Sin tipo de pago";
};

const getResponsable = (row: OrdenCompraServicio) => {
    const trabajador = row.trabajador || row.Trabajador;
    const nombre = [trabajador?.nombres, trabajador?.apellidos].filter(Boolean).join(" ").trim();

    return trabajador?.descripcion || nombre || "";
};

const estadoBadgeClass = (estado: string) => {
    const normalized = estado.trim().toUpperCase();

    if (normalized.includes("ANUL")) return "border-red-100 bg-red-50 text-red-600";
    if (normalized.includes("APROB") || normalized.includes("COMPROMET")) return "border-emerald-200 bg-emerald-50 text-emerald-700";
    if (normalized.includes("PEND")) return "border-amber-200 bg-amber-50 text-amber-700";

    return "border-blue-200 bg-blue-50 text-blue-700";
};

const estadoBloqueaAcciones = (estado: string) => {
    const normalized = estado.trim().toUpperCase();
    return normalized.includes("APROB") || normalized.includes("COMPROMET") || normalized.includes("ANUL");
};

const openPdfFromBase64 = (base64Raw: string) => {
    const base64 = base64Raw.includes("base64,")
        ? base64Raw.split("base64,").pop() || ""
        : base64Raw;

    if (!base64.trim()) {
        throw new Error("El documento no contiene base64 válido.");
    }

    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);

    for (let i = 0; i < byteCharacters.length; i += 1) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }

    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: "application/pdf" });
    window.open(URL.createObjectURL(blob), "_blank");
};

export default function OrdenCompraServicioPage() {
    const router = useRouter();
    const {
        data,
        loading,
        meta,
        searchTerm,
        setSearchTerm,
        filters,
        setFilters,
        fetchData
    } = useCrud<OrdenCompraServicio>(ordenCompraServicioService, null, initialFilters);

    const debouncedSearch = useDebounce(searchTerm, 500);
    const [showFilters, setShowFilters] = useState(false);
    const [draftFilters, setDraftFilters] = useState<OrdenCompraServicioFilters>(initialFilters);
    const [loadingDropdowns, setLoadingDropdowns] = useState(false);
    const [tipoOrdenOptions, setTipoOrdenOptions] = useState<Option[]>([]);
    const [proveedorOptions, setProveedorOptions] = useState<Option[]>([]);
    const [monedaOptions, setMonedaOptions] = useState<Option[]>([]);
    const [approvingId, setApprovingId] = useState("");
    const [printingId, setPrintingId] = useState("");

    useEffect(() => {
        fetchData(1, debouncedSearch, filters);
    }, [debouncedSearch, filters, fetchData]);

    useEffect(() => {
        const fetchDropdowns = async () => {
            setLoadingDropdowns(true);

            try {
                const [tipoOrdenResponse, proveedorResponse, monedaResponse] = await Promise.all([
                    tipoOrdenService.getAll(1, 200, "", { FiltroEstado: true }),
                    proveedorService.getAll(1, 200, "", { estado: [1] }),
                    monedaService.getAll(1, 200, "")
                ]);

                if (tipoOrdenResponse.isSuccess) {
                    setTipoOrdenOptions((tipoOrdenResponse.data || []).map((item) => {
                        const raw = item as Record<string, unknown>;
                        const value = String(raw.tipoOrden || raw.tipo_orden || raw.TipoOrden || raw.tipoordenId || raw.tipoOrdenId || "").trim();
                        const label = String(raw.descripcion || raw.Descripcion || value || "SIN TIPO").trim();

                        return { value, label };
                    }).filter(item => String(item.value).trim() !== ""));
                }

                if (proveedorResponse.isSuccess) {
                    setProveedorOptions((proveedorResponse.data || []).map((item) => ({
                        value: item.proveedorId || item.ProveedorId || "",
                        label: item.descripcion || item.Descripcion || item.proveedorId || item.ProveedorId || "SIN PROVEEDOR"
                    })).filter(item => String(item.value).trim() !== ""));
                }

                if (monedaResponse.isSuccess) {
                    setMonedaOptions((monedaResponse.data || []).map((item) => ({
                        value: item.monedaId || item.MonedaId || "",
                        label: item.descripcion || item.Descripcion || item.monedaId || item.MonedaId || "SIN MONEDA"
                    })).filter(item => String(item.value).trim() !== ""));
                }
            } finally {
                setLoadingDropdowns(false);
            }
        };

        fetchDropdowns();
    }, []);

    const totalActiveFilters = useMemo(() => {
        const activeArrays = [
            filters.estado || [],
            filters.tipoOrden || [],
            filters.proveedorId || [],
            filters.monedaId || []
        ].reduce((sum, value) => sum + value.length, 0);

        return activeArrays + (filters.fechaInicio ? 1 : 0) + (filters.fechaFin ? 1 : 0);
    }, [filters]);

    const draftTotalActive = useMemo(() => {
        const activeArrays = [
            draftFilters.estado || [],
            draftFilters.tipoOrden || [],
            draftFilters.proveedorId || [],
            draftFilters.monedaId || []
        ].reduce((sum, value) => sum + value.length, 0);

        return activeArrays + (draftFilters.fechaInicio ? 1 : 0) + (draftFilters.fechaFin ? 1 : 0);
    }, [draftFilters]);

    const handleOpenFilters = () => {
        setDraftFilters(filters as OrdenCompraServicioFilters);
        setShowFilters(true);
    };

    const handleApplyFilters = () => {
        setFilters(draftFilters);
        setShowFilters(false);
    };

    const handleClearFilters = () => {
        setDraftFilters(initialFilters);
        setFilters(initialFilters);
    };

    const handleAnular = async (row: OrdenCompraServicio) => {
        const ordenId = getOrdenId(row);
        const numeroOrden = getNumeroOrden(row);
        if (!ordenId) return;

        const result = await Swal.fire({
            title: "¿Anular orden?",
            text: `Se anulará la orden ${numeroOrden}.`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Anular",
            cancelButtonText: "Cancelar",
            confirmButtonColor: "#dc2626"
        });

        if (!result.isConfirmed) return;

        const response = await ordenCompraServicioService.anular(ordenId);

        if (!response.isSuccess) {
            toast.error(response.message || "No se pudo anular la orden.");
            return;
        }

        toast.success(response.message || "Orden anulada correctamente.");
        fetchData(meta.currentPage, searchTerm, filters);
    };

    const handleAprobar = async (row: OrdenCompraServicio) => {
        const ordenId = getOrdenId(row);
        const numeroOrden = getNumeroOrden(row);
        if (!ordenId) return;

        const result = await Swal.fire({
            title: "¿Aprobar orden?",
            text: `Se aprobará la orden ${numeroOrden}.`,
            icon: "question",
            showCancelButton: true,
            confirmButtonText: "Aprobar",
            cancelButtonText: "Cancelar",
            confirmButtonColor: "#059669"
        });

        if (!result.isConfirmed) return;

        setApprovingId(ordenId);

        try {
            const response = await ordenCompraServicioService.aprobar(ordenId);

            if (!response.isSuccess) {
                toast.error(response.message || "No se pudo aprobar la orden.");
                return;
            }

            const mensaje = typeof response.data === "object" && response.data !== null && "mensaje" in response.data
                ? String((response.data as { mensaje?: unknown }).mensaje || "")
                : "";

            toast.success(mensaje || "Orden aprobada correctamente.");
            fetchData(meta.currentPage, searchTerm, filters);
        } finally {
            setApprovingId("");
        }
    };

    const handlePrint = async (row: OrdenCompraServicio) => {
        const ordenId = getOrdenId(row);
        if (!ordenId || printingId === ordenId) return;

        setPrintingId(ordenId);

        try {
            const response = await ordenCompraServicioService.imprimir(ordenId);
            const base64 = String(response.data?.base64 || "").trim();

            if (!response.isSuccess || !base64) {
                toast.error(response.message || "Error al generar la impresión.");
                return;
            }

            openPdfFromBase64(base64);
            toast.success(response.message || "Impresión generada correctamente.");
        } catch (error) {
            console.error("Error al imprimir:", error);
            const message = error instanceof Error ? error.message : "Error de conexión al intentar imprimir.";
            toast.error(message);
        } finally {
            setPrintingId("");
        }
    };

    const columns = [
        {
            header: "Fecha Emision",
            width: "125px",
            render: (row: OrdenCompraServicio) => (
                <span className="text-xs font-bold text-slate-700">
                    {formatDate(getString(row, ["fechaEmision", "fecha_emision", "FechaEmision"]))}
                </span>
            )
        },
        {
            header: "N° Orden",
            width: "150px",
            render: (row: OrdenCompraServicio) => (
                <span className="font-mono text-xs font-bold text-blue-700">{getNumeroOrden(row)}</span>
            )
        },
        {
            header: "Tipo Orden",
            width: "145px",
            render: (row: OrdenCompraServicio) => (
                <span className="inline-flex rounded-md border border-sky-100 bg-sky-50 px-2 py-1 text-[10px] font-black uppercase text-sky-700" title={getTipoOrden(row)}>
                    {getTipoOrden(row)}
                </span>
            )
        },
        {
            header: "Proveedor",
            className: "min-w-[230px]",
            render: (row: OrdenCompraServicio) => {
                const proveedorDoc = getProveedorDoc(row);
                const responsable = getResponsable(row);

                return (
                    <div className="flex items-start gap-2">
                        <IconBuildingStore size={16} className="mt-0.5 shrink-0 text-slate-400" />
                        <div className="min-w-0">
                            <span className="line-clamp-2 text-[11px] font-semibold uppercase leading-tight text-slate-700" title={getProveedor(row)}>
                                {getProveedor(row)}
                            </span>
                            {proveedorDoc && <p className="mt-0.5 font-mono text-[10px] font-semibold text-slate-400">{proveedorDoc}</p>}
                            {responsable && <p className="mt-0.5 truncate text-[10px] font-semibold text-slate-500" title={responsable}>Resp: {responsable}</p>}
                        </div>
                    </div>
                );
            }
        },
        {
            header: "Moneda",
            width: "115px",
            render: (row: OrdenCompraServicio) => (
                <div className="flex flex-col gap-0.5">
                    <span className="w-fit rounded-md border border-indigo-100 bg-indigo-50 px-2 py-1 text-[10px] font-bold uppercase text-indigo-700">
                        {getMoneda(row)}
                    </span>
                    <span className="ml-1 text-[10px] font-black text-slate-400">{getMonedaSymbol(row)}</span>
                </div>
            )
        },
        {
            header: "T. Pago",
            width: "140px",
            render: (row: OrdenCompraServicio) => (
                <span className="line-clamp-2 text-[11px] font-semibold uppercase leading-tight text-slate-600" title={getTipoPago(row)}>
                    {getTipoPago(row)}
                </span>
            )
        },
        {
            header: "Total",
            width: "120px",
            className: "text-right",
            render: (row: OrdenCompraServicio) => (
                <span className="font-mono text-xs font-bold text-emerald-700">
                    {getMonedaSymbol(row)} {formatMoney(getValue(row, ["total", "Total"]))}
                </span>
            )
        },
        {
            header: "Estado",
            width: "125px",
            render: (row: OrdenCompraServicio) => (
                <span className={`inline-flex w-fit rounded-full border px-2.5 py-1 text-[10px] font-black uppercase ${estadoBadgeClass(getEstado(row))}`}>
                    {getEstado(row)}
                </span>
            )
        },
        {
            header: "Acciones",
            width: "175px",
            className: "text-center",
            render: (row: OrdenCompraServicio) => {
                const ordenId = getOrdenId(row);
                const estado = getEstado(row).trim().toUpperCase();
                const lockedActions = estadoBloqueaAcciones(estado);
                const canApprove = !lockedActions;
                const isApproving = approvingId === ordenId;
                const isPrinting = printingId === ordenId;

                return (
                    <div className="flex items-center justify-center gap-1">
                        <button
                            type="button"
                            onClick={() => ordenId && router.push(`/dashboard/orden-compra-servicio/editar/${ordenId}?mode=view`)}
                            className="rounded p-1.5 text-slate-400 transition-colors hover:bg-slate-50 hover:text-blue-600"
                            title="Ver detalle"
                        >
                            <IconEye size={17} />
                        </button>
                        <button
                            type="button"
                            onClick={() => ordenId && router.push(`/dashboard/orden-compra-servicio/editar/${ordenId}`)}
                            disabled={lockedActions}
                            className="rounded p-1.5 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-35"
                            title="Editar"
                        >
                            <IconEdit size={17} />
                        </button>
                        <button
                            type="button"
                            onClick={() => handleAprobar(row)}
                            disabled={!canApprove || isApproving}
                            className="rounded p-1.5 text-slate-400 transition-colors hover:bg-emerald-50 hover:text-emerald-600 disabled:cursor-not-allowed disabled:opacity-35"
                            title={canApprove ? "Aprobar" : "Orden ya aprobada, comprometida o anulada"}
                        >
                            <IconCircleCheck size={17} className={isApproving ? "animate-pulse" : ""} />
                        </button>
                        <button
                            type="button"
                            onClick={() => handlePrint(row)}
                            disabled={!ordenId || isPrinting}
                            className="rounded p-1.5 text-slate-400 transition-colors hover:bg-emerald-50 hover:text-emerald-600 disabled:cursor-not-allowed disabled:opacity-35"
                            title="Imprimir"
                        >
                            {isPrinting ? (
                                <IconRefresh size={17} className="animate-spin text-emerald-600" />
                            ) : (
                                <IconPrinter size={17} />
                            )}
                        </button>
                        <button
                            type="button"
                            onClick={() => handleAnular(row)}
                            disabled={lockedActions}
                            className="rounded p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-35"
                            title="Anular"
                        >
                            <IconBan size={17} />
                        </button>
                    </div>
                );
            }
        }
    ];

    return (
        <div className="p-6 animate-fade-in-up">
            <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-800">Orden Compra/Servicio</h1>
                    <p className="text-sm text-slate-500">Gestión de órdenes de compra y servicio.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => fetchData(meta.currentPage, searchTerm, filters)}
                        className="rounded-lg border border-slate-300 bg-white p-2.5 shadow-sm transition-all hover:text-blue-600"
                        title="Actualizar"
                    >
                        <IconRefresh size={20} className={loading ? "animate-spin" : ""} />
                    </button>
                    <button
                        type="button"
                        onClick={() => router.push("/dashboard/orden-compra-servicio/crear")}
                        className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 font-bold text-white shadow-lg shadow-blue-200 transition-all hover:bg-blue-700 active:scale-95"
                    >
                        <IconCirclePlus size={20} /> Nueva Orden
                    </button>
                </div>
            </div>

            <div className="mb-4 flex gap-3">
                <div className="relative flex-1">
                    <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por número, proveedor o estado..."
                        className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm outline-none transition-all focus:border-blue-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <button
                    type="button"
                    onClick={handleOpenFilters}
                    className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 font-semibold transition-all ${
                        totalActiveFilters > 0
                            ? "border-blue-200 bg-blue-50 text-blue-700"
                            : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                >
                    <IconFilter size={20} />
                    Filtros {totalActiveFilters > 0 && `(${totalActiveFilters})`}
                </button>
            </div>

            <DataTable
                columns={columns}
                data={data}
                loading={loading}
                meta={meta}
                onPageChange={(page) => fetchData(page, searchTerm, filters)}
                emptyMessage="No se encontraron órdenes de compra/servicio"
            />

            <FiltrosAvanzados
                isOpen={showFilters}
                onClose={() => setShowFilters(false)}
                onApply={handleApplyFilters}
                onClear={handleClearFilters}
                totalActive={draftTotalActive}
            >
                {loadingDropdowns ? (
                    <div className="py-10 text-center text-sm italic text-slate-400">Cargando catálogos...</div>
                ) : (
                    <div className="flex flex-col gap-5">
                        <MultiSelect
                            label="Estado"
                            options={estadoOptions}
                            value={draftFilters.estado || []}
                            onChange={(value) => setDraftFilters(prev => ({ ...prev, estado: value }))}
                        />
                        <MultiSelect
                            label="Tipo Orden"
                            options={tipoOrdenOptions}
                            value={draftFilters.tipoOrden || []}
                            onChange={(value) => setDraftFilters(prev => ({ ...prev, tipoOrden: value }))}
                        />
                        <MultiSelect
                            label="Proveedor"
                            options={proveedorOptions}
                            value={draftFilters.proveedorId || []}
                            onChange={(value) => setDraftFilters(prev => ({ ...prev, proveedorId: value }))}
                        />
                        <MultiSelect
                            label="Moneda"
                            options={monedaOptions}
                            value={draftFilters.monedaId || []}
                            onChange={(value) => setDraftFilters(prev => ({ ...prev, monedaId: value }))}
                        />
                        <div className="space-y-3">
                            <label className="text-xs font-bold uppercase text-slate-500">Rango de Fechas</label>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="flex flex-col gap-1.5">
                                    <span className="ml-1 text-[10px] font-bold text-slate-400">Desde</span>
                                    <input
                                        type="date"
                                        className="w-full rounded-lg border border-slate-200 p-2 text-xs outline-none focus:ring-1 focus:ring-blue-500"
                                        value={draftFilters.fechaInicio || ""}
                                        onChange={(e) => setDraftFilters(prev => ({ ...prev, fechaInicio: e.target.value }))}
                                    />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                    <span className="ml-1 text-[10px] font-bold text-slate-400">Hasta</span>
                                    <input
                                        type="date"
                                        className="w-full rounded-lg border border-slate-200 p-2 text-xs outline-none focus:ring-1 focus:ring-blue-500"
                                        value={draftFilters.fechaFin || ""}
                                        onChange={(e) => setDraftFilters(prev => ({ ...prev, fechaFin: e.target.value }))}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </FiltrosAvanzados>
        </div>
    );
}
