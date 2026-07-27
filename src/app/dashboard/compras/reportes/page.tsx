"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
    IconChevronRight,
    IconClipboardList,
    IconFileInvoice,
    IconFileSpreadsheet,
    IconFileTypePdf,
    IconLoader,
    IconReportAnalytics,
    IconRefresh,
    IconX
} from "@tabler/icons-react";

import SearchableSelect from "@/components/forms/SearchableSelect";
import { documentoCompraService } from "@/services/documentoCompraService";
import { monedaService } from "@/services/monedaService";
import { ordenCompraServicioService } from "@/services/ordenCompraServicioService";
import { proveedorService } from "@/services/proveedorService";
import { tipoPagoService } from "@/services/tipoPagoService";
import {
    DocumentoCompraFiltros,
    TipoDocumentoComercialCompra
} from "@/types/documentoCompra.types";
import { Moneda } from "@/types/moneda.types";
import { OrdenCompraServicioFilters } from "@/types/ordenCompraServicio.types";
import { Proveedor } from "@/types/proveedor.types";
import { TipoPago } from "@/types/tipoPago.types";
import {
    buildTimestampedFileName,
    downloadBlob,
    getDownloadErrorMessage
} from "@/utils/fileDownload";

type ReportFormat = "excel" | "pdf";
type ReportType = "orden" | "documento";

type OrderFilterState = {
    estado: string;
    tipoOrden: string;
    proveedorId: string;
    fechaInicio: string;
    fechaFin: string;
};

type DocumentFilterState = {
    tipoDocumentoId: string;
    proveedorId: string;
    monedaId: string;
    tipoPagoId: string;
    estado: string;
    fechaInicio: string;
    fechaFin: string;
    tipoCompra: string;
};

type SelectOption = {
    value: string | number;
    label?: string;
    aux?: string | number;
    raw?: unknown;
};

const estadoOptions = ["REGISTRADO", "PENDIENTE", "APROBADO", "COMPROMETIDO", "ANULADO"];
const documentoEstadoOptions = ["REGISTRADO", "COMPROMETIDO", "ANULADO"];
const EMPRESA_ID = "005";

const initialOrderFilters: OrderFilterState = {
    estado: "",
    tipoOrden: "",
    proveedorId: "",
    fechaInicio: "",
    fechaFin: ""
};

const initialDocumentFilters: DocumentFilterState = {
    tipoDocumentoId: "",
    proveedorId: "",
    monedaId: "",
    tipoPagoId: "",
    estado: "",
    fechaInicio: "",
    fechaFin: "",
    tipoCompra: ""
};

const dateInputClass = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-50";
const inputClass = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-50";

const today = () => new Date().toISOString().slice(0, 10);

const firstDayOfMonth = () => {
    const date = new Date();
    return new Date(date.getFullYear(), date.getMonth(), 1).toISOString().slice(0, 10);
};

const getDefaultOrderFilters = (): OrderFilterState => ({
    ...initialOrderFilters,
    fechaInicio: firstDayOfMonth(),
    fechaFin: today()
});

const getDefaultDocumentFilters = (): DocumentFilterState => ({
    ...initialDocumentFilters,
    fechaInicio: firstDayOfMonth(),
    fechaFin: today()
});

function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <label className="flex flex-col gap-1.5">
            <span className="ml-1 text-[10px] font-bold uppercase text-slate-500">{label}</span>
            {children}
        </label>
    );
}

function DownloadButton({
    label,
    format,
    loading,
    onClick
}: {
    label: string;
    format: ReportFormat;
    loading: ReportFormat | null;
    onClick: () => void;
}) {
    const isLoading = loading === format;
    const Icon = format === "pdf" ? IconFileTypePdf : IconFileSpreadsheet;
    const colorClass = format === "pdf"
        ? "bg-red-600 hover:bg-red-700"
        : "bg-emerald-600 hover:bg-emerald-700";

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={Boolean(loading)}
            className={`flex min-h-11 w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-bold text-white shadow-sm transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60 disabled:shadow-none ${colorClass}`}
        >
            {isLoading ? <IconLoader size={18} className="animate-spin" /> : <Icon size={18} />}
            <span className="truncate">{isLoading ? "Generando..." : label}</span>
        </button>
    );
}

export default function ComprasReportesPage() {
    const [orderFilters, setOrderFilters] = useState<OrderFilterState>(() => getDefaultOrderFilters());
    const [documentFilters, setDocumentFilters] = useState<DocumentFilterState>(() => getDefaultDocumentFilters());
    const [orderProveedorLabel, setOrderProveedorLabel] = useState("");
    const [documentProveedorLabel, setDocumentProveedorLabel] = useState("");
    const [documentTypeLabel, setDocumentTypeLabel] = useState("");
    const [documentCurrencyLabel, setDocumentCurrencyLabel] = useState("");
    const [documentPaymentLabel, setDocumentPaymentLabel] = useState("");
    const [activeReport, setActiveReport] = useState<ReportType | null>(null);
    const [loading, setLoading] = useState<ReportFormat | null>(null);

    const orderReportFilters = useMemo<OrdenCompraServicioFilters>(() => ({
        estado: orderFilters.estado ? [orderFilters.estado] : [],
        tipoOrden: orderFilters.tipoOrden ? [orderFilters.tipoOrden] : [],
        proveedorId: orderFilters.proveedorId.trim() ? [orderFilters.proveedorId.trim()] : [],
        fechaInicio: orderFilters.fechaInicio,
        fechaFin: orderFilters.fechaFin
    }), [orderFilters]);

    const documentReportFilters = useMemo<DocumentoCompraFiltros>(() => ({
        tipo_documento: documentFilters.tipoDocumentoId ? [documentFilters.tipoDocumentoId] : [],
        proveedor: documentFilters.proveedorId ? [documentFilters.proveedorId] : [],
        moneda: documentFilters.monedaId ? [documentFilters.monedaId] : [],
        tipo_pago: documentFilters.tipoPagoId ? [documentFilters.tipoPagoId] : [],
        estado: documentFilters.estado,
        fecha_inicio: documentFilters.fechaInicio,
        fecha_fin: documentFilters.fechaFin,
        tipo_compra: documentFilters.tipoCompra
    }), [documentFilters]);

    const setOrderField = (field: keyof OrderFilterState, value: string) => {
        setOrderFilters(previous => ({ ...previous, [field]: value }));
    };

    const setDocumentField = (field: keyof DocumentFilterState, value: string) => {
        setDocumentFilters(previous => ({ ...previous, [field]: value }));
    };

    const resetActiveFilters = () => {
        if (activeReport === "documento") {
            setDocumentFilters(getDefaultDocumentFilters());
            setDocumentProveedorLabel("");
            setDocumentTypeLabel("");
            setDocumentCurrencyLabel("");
            setDocumentPaymentLabel("");
            return;
        }

        setOrderFilters(getDefaultOrderFilters());
        setOrderProveedorLabel("");
    };

    const fetchProviderOptions = async (term: string): Promise<SelectOption[]> => {
        const response = await proveedorService.getAll(1, 20, term, { estado: [1] });
        return (response.data || []).map((item: Proveedor) => ({
            value: item.proveedorId || item.ProveedorId || "",
            label: item.descripcion || item.Descripcion || "",
            aux: item.numero_doc || item.numeroDoc,
            raw: item
        })).filter(item => item.value);
    };

    const fetchDocumentTypeOptions = async (term: string): Promise<SelectOption[]> => {
        const response = await documentoCompraService.getTiposDocumento(term);
        return (response.data || []).map((item: TipoDocumentoComercialCompra) => ({
            value: item.tipodoccomercialId,
            label: item.descripcion,
            aux: item.abreviatura,
            raw: item
        }));
    };

    const fetchCurrencyOptions = async (term: string): Promise<SelectOption[]> => {
        const response = await monedaService.getAll(1, 20, term);
        return (response.data || []).map((item: Moneda) => ({
            value: item.monedaId || item.MonedaId || "",
            label: item.descripcion || item.Descripcion || "",
            aux: item.simbolomoneda || item.Simbolomoneda,
            raw: item
        })).filter(item => item.value);
    };

    const fetchPaymentOptions = async (term: string): Promise<SelectOption[]> => {
        const response = await tipoPagoService.getAll(1, 20, term, { FiltroEstado: true });
        return (response.data || []).map((item: TipoPago) => ({
            value: item.tipopagoId || item.TipoPagoId || "",
            label: item.descripcion || item.Descripcion || "",
            raw: item
        })).filter(item => item.value);
    };

    const download = async (format: ReportFormat) => {
        if (!activeReport || loading) return;

        const activeFilters = activeReport === "documento" ? documentFilters : orderFilters;
        if (activeFilters.fechaInicio && activeFilters.fechaFin && activeFilters.fechaInicio > activeFilters.fechaFin) {
            toast.warning("La fecha inicial no puede ser mayor que la fecha final.");
            return;
        }

        setLoading(format);
        try {
            if (activeReport === "orden") {
                if (format === "excel") {
                    await ordenCompraServicioService.descargarReporteExcel(orderReportFilters);
                } else {
                    await ordenCompraServicioService.descargarReportePdf(orderReportFilters);
                }
            } else {
                const result = format === "excel"
                    ? await documentoCompraService.descargarReporteExcel(EMPRESA_ID, {
                        filters: documentReportFilters,
                        soloDisponibles: false,
                        soloStock: false
                    })
                    : await documentoCompraService.descargarReportePdf(EMPRESA_ID, {
                        filters: documentReportFilters,
                        soloDisponibles: false,
                        soloStock: false
                    });
                const extension = format === "excel" ? "xlsx" : "pdf";
                const fileName = result.fileName
                    || buildTimestampedFileName("Reporte_Documentos_Compra", extension);

                downloadBlob(result.blob, fileName);
            }
            toast.success(format === "excel"
                ? "Reporte Excel descargado correctamente."
                : "Reporte PDF descargado correctamente.");
        } catch (error) {
            toast.error(await getDownloadErrorMessage(
                error,
                format === "excel"
                    ? "No se pudo generar el reporte Excel."
                    : "No se pudo generar el reporte PDF."
            ));
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-6">
            <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                    <div className="mb-2 text-sm text-slate-500">
                        <span>Módulo Compras</span> / <span className="font-bold text-slate-700">Reportes</span>
                    </div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-800">Centro de Reportes</h1>
                    <p className="mt-1 max-w-2xl text-sm text-slate-500">
                        Seleccione un reporte para configurar filtros y generar Excel o PDF.
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
                <section className="overflow-hidden rounded-xl border border-l-4 border-slate-200 border-l-blue-500 bg-white shadow-sm transition hover:border-slate-300 hover:shadow-md">
                    <button
                        type="button"
                        onClick={() => setActiveReport("orden")}
                        className="flex w-full items-center gap-3 px-4 py-4 text-left"
                    >
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-blue-100 bg-blue-50 text-blue-700">
                            <IconClipboardList size={22} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-800">Orden Compra/Servicio</h2>
                            <p className="mt-0.5 text-xs text-slate-500">Reporte de órdenes por estado, tipo, proveedor y rango de fechas.</p>
                        </div>
                        <span className="hidden rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50 sm:inline-flex">
                            Configurar
                        </span>
                        <IconChevronRight size={20} className="text-slate-400 sm:hidden" />
                    </button>
                </section>

                <section className="overflow-hidden rounded-xl border border-l-4 border-slate-200 border-l-emerald-500 bg-white shadow-sm transition hover:border-slate-300 hover:shadow-md">
                    <button
                        type="button"
                        onClick={() => setActiveReport("documento")}
                        className="flex w-full items-center gap-3 px-4 py-4 text-left"
                    >
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-emerald-100 bg-emerald-50 text-emerald-700">
                            <IconFileInvoice size={22} />
                        </div>
                        <div className="min-w-0 flex-1">
                            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-800">Documento Comercial</h2>
                            <p className="mt-0.5 text-xs text-slate-500">Reporte de documentos de compra por tipo, proveedor, estado y rango de fechas.</p>
                        </div>
                        <span className="hidden rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50 sm:inline-flex">
                            Configurar
                        </span>
                        <IconChevronRight size={20} className="text-slate-400 sm:hidden" />
                    </button>
                </section>
            </div>

            <div
                className={`fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 transition-opacity ${activeReport ? "opacity-100" : "pointer-events-none opacity-0"}`}
                onClick={() => setActiveReport(null)}
            >
                <div
                    role="dialog"
                    aria-modal="true"
                    className={`flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl transition-all duration-200 ${activeReport ? "scale-100 opacity-100" : "scale-95 opacity-0"}`}
                    onClick={event => event.stopPropagation()}
                >
                    <div className={`${activeReport === "documento" ? "bg-emerald-600" : "bg-blue-600"} px-5 py-5 text-white`}>
                        <div className="flex items-start gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-white/25 bg-white/15 text-white shadow-sm">
                                <IconReportAnalytics size={22} />
                            </div>
                            <div className="min-w-0 flex-1">
                                <h3 className="text-base font-bold uppercase tracking-wide text-white">
                                    {activeReport === "documento" ? "Documento Comercial" : "Orden Compra/Servicio"}
                                </h3>
                                <p className="mt-1 text-xs leading-relaxed text-white/85">
                                    Configure filtros y genere el archivo.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setActiveReport(null)}
                                className="rounded-lg p-2 text-white/80 transition hover:bg-white/15 hover:text-white"
                            >
                                <IconX size={20} />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 space-y-4 overflow-y-auto bg-white px-5 py-5">
                        {activeReport === "documento" ? (
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <SearchableSelect
                                    label="Tipo Documento"
                                    value={documentFilters.tipoDocumentoId}
                                    fetchCustom={fetchDocumentTypeOptions}
                                    fallbackLabel={documentTypeLabel}
                                    placeholder="Todos los tipos"
                                    onChange={event => {
                                        setDocumentField("tipoDocumentoId", String(event.target.value));
                                        setDocumentTypeLabel(String(event.option?.label || ""));
                                    }}
                                />

                                <Field label="Estado">
                                    <select
                                        value={documentFilters.estado}
                                        onChange={event => setDocumentField("estado", event.target.value)}
                                        className={inputClass}
                                    >
                                        <option value="">Todos</option>
                                        {documentoEstadoOptions.map(option => <option key={option} value={option}>{option}</option>)}
                                    </select>
                                </Field>

                                <div className="sm:col-span-2">
                                    <SearchableSelect
                                        label="Proveedor"
                                        value={documentFilters.proveedorId}
                                        fetchCustom={fetchProviderOptions}
                                        fallbackLabel={documentProveedorLabel}
                                        placeholder="Todos los proveedores"
                                        onChange={event => {
                                            setDocumentField("proveedorId", String(event.target.value));
                                            setDocumentProveedorLabel(String(event.option?.label || ""));
                                        }}
                                    />
                                </div>

                                <SearchableSelect
                                    label="Moneda"
                                    value={documentFilters.monedaId}
                                    fetchCustom={fetchCurrencyOptions}
                                    fallbackLabel={documentCurrencyLabel}
                                    placeholder="Todas las monedas"
                                    onChange={event => {
                                        setDocumentField("monedaId", String(event.target.value));
                                        setDocumentCurrencyLabel(String(event.option?.label || ""));
                                    }}
                                />

                                <SearchableSelect
                                    label="Tipo Pago"
                                    value={documentFilters.tipoPagoId}
                                    fetchCustom={fetchPaymentOptions}
                                    fallbackLabel={documentPaymentLabel}
                                    placeholder="Todos los tipos de pago"
                                    onChange={event => {
                                        setDocumentField("tipoPagoId", String(event.target.value));
                                        setDocumentPaymentLabel(String(event.option?.label || ""));
                                    }}
                                />

                                <Field label="Tipo Compra">
                                    <select
                                        value={documentFilters.tipoCompra}
                                        onChange={event => setDocumentField("tipoCompra", event.target.value)}
                                        className={inputClass}
                                    >
                                        <option value="">Todos</option>
                                        <option value="COMPRA NACIONAL">Compra productos locales</option>
                                        <option value="IMPORTACION">Compra productos importados</option>
                                    </select>
                                </Field>

                                <div aria-hidden="true" className="hidden sm:block" />

                                <Field label="Desde">
                                    <input
                                        type="date"
                                        value={documentFilters.fechaInicio}
                                        onChange={event => setDocumentField("fechaInicio", event.target.value)}
                                        className={dateInputClass}
                                    />
                                </Field>

                                <Field label="Hasta">
                                    <input
                                        type="date"
                                        value={documentFilters.fechaFin}
                                        onChange={event => setDocumentField("fechaFin", event.target.value)}
                                        className={dateInputClass}
                                    />
                                </Field>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <Field label="Estado">
                                    <select
                                        value={orderFilters.estado}
                                        onChange={event => setOrderField("estado", event.target.value)}
                                        className={inputClass}
                                    >
                                        <option value="">Todos</option>
                                        {estadoOptions.map(option => <option key={option} value={option}>{option}</option>)}
                                    </select>
                                </Field>

                                <Field label="Tipo Orden">
                                    <select
                                        value={orderFilters.tipoOrden}
                                        onChange={event => setOrderField("tipoOrden", event.target.value)}
                                        className={inputClass}
                                    >
                                        <option value="">Todos</option>
                                        <option value="OC">Orden compra</option>
                                        <option value="OS">Orden servicio</option>
                                    </select>
                                </Field>

                                <div className="sm:col-span-2">
                                    <SearchableSelect
                                        label="Proveedor"
                                        value={orderFilters.proveedorId}
                                        fetchCustom={fetchProviderOptions}
                                        fallbackLabel={orderProveedorLabel}
                                        placeholder="Todos los proveedores"
                                        onChange={event => {
                                            setOrderField("proveedorId", String(event.target.value));
                                            setOrderProveedorLabel(String(event.option?.label || ""));
                                        }}
                                    />
                                </div>

                                <Field label="Desde">
                                    <input
                                        type="date"
                                        value={orderFilters.fechaInicio}
                                        onChange={event => setOrderField("fechaInicio", event.target.value)}
                                        className={dateInputClass}
                                    />
                                </Field>

                                <Field label="Hasta">
                                    <input
                                        type="date"
                                        value={orderFilters.fechaFin}
                                        onChange={event => setOrderField("fechaFin", event.target.value)}
                                        className={dateInputClass}
                                    />
                                </Field>
                            </div>
                        )}
                    </div>

                    <div className="space-y-3 border-t border-slate-100 bg-white px-5 py-4">
                        <button
                            type="button"
                            onClick={resetActiveFilters}
                            disabled={Boolean(loading)}
                            className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <IconRefresh size={16} />
                            Limpiar filtros
                        </button>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            <DownloadButton label="Generar Excel" format="excel" loading={loading} onClick={() => download("excel")} />
                            <DownloadButton label="Generar PDF" format="pdf" loading={loading} onClick={() => download("pdf")} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
