"use client";

import { useEffect, useMemo, useState } from "react";
import {
    IconChevronLeft,
    IconChevronRight,
    IconDownload,
    IconEye,
    IconLoader,
    IconSearch,
    IconShoppingCart
} from "@tabler/icons-react";
import { toast } from "sonner";

import Modal from "@/components/ui/Modal";
import { ordenCompraServicioService } from "@/services/ordenCompraServicioService";
import { OrdenCompraServicio, OrdenCompraServicioDetalle } from "@/types/ordenCompraServicio.types";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onImport: (order: OrdenCompraServicio) => void;
}

const PAGE_SIZE = 20;

const dateInput = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

const initialFromDate = () => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return dateInput(date);
};

const first = (source: Record<string, unknown>, keys: string[]) => {
    for (const key of keys) {
        const value = source[key];
        if (value !== undefined && value !== null && String(value).trim() !== "") return String(value).trim();
    }
    return "";
};

const nested = (source: Record<string, unknown>, keys: string[]) => {
    for (const key of keys) {
        const value = source[key];
        if (value && typeof value === "object") return value as Record<string, unknown>;
    }
    return {};
};

const numberOf = (value: unknown) => {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
};

const money = (value: unknown) => new Intl.NumberFormat("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
}).format(numberOf(value));

const displayDate = (value: unknown) => {
    if (!value) return "-";
    const date = new Date(String(value));
    return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString("es-PE");
};

const orderIdOf = (order: OrdenCompraServicio) => first(order as Record<string, unknown>, [
    "ordencompraservicioId",
    "ordenCompraServicioId",
    "OrdenCompraServicioId"
]);

const orderNumberOf = (order: OrdenCompraServicio) => first(order as Record<string, unknown>, [
    "numero_ordencompra",
    "numeroOrdenCompra",
    "NumeroOrdenCompra"
]) || orderIdOf(order);

const providerOf = (order: OrdenCompraServicio) => {
    const raw = order as Record<string, unknown>;
    return first(nested(raw, ["proveedor", "Proveedor"]), ["descripcion", "Descripcion"]) || first(raw, ["proveedorNombre", "proveedornombre", "proveedorId"]);
};

const currencyOf = (order: OrdenCompraServicio) => {
    const raw = order as Record<string, unknown>;
    const currency = nested(raw, ["moneda", "Moneda"]);
    return first(currency, ["descripcion", "abreviatura", "simbolomoneda"]) || first(raw, ["monedaId"]);
};

const paymentOf = (order: OrdenCompraServicio) => {
    const raw = order as Record<string, unknown>;
    return first(nested(raw, ["tipoPago", "TipoPago"]), ["descripcion"]) || first(raw, ["tipopagoId", "tipoPagoId"]);
};

const totalOfDetail = (detail: OrdenCompraServicioDetalle) => {
    const raw = detail as Record<string, unknown>;
    return numberOf(raw.importe ?? raw.Importe);
};

const operationOfDetail = (detail: OrdenCompraServicioDetalle) => {
    const raw = detail as Record<string, unknown>;
    const bien = nested(raw, ["bien", "Bien"]);
    const operation = nested(bien, ["operacionesItem", "operacionItem", "OperacionesItem", "OperacionItem"]);
    return {
        id: first(bien, ["operacionesItemId", "operacionesitemId", "operacionItemId"]) || first(operation, ["operacionesItemId", "operacionesitemId", "operacionItemId"]),
        label: first(operation, ["descripcion", "Descripcion"])
    };
};

const isAffectedDetail = (detail: OrdenCompraServicioDetalle) => {
    const raw = detail as Record<string, unknown>;
    const operation = operationOfDetail(detail);
    if (operation.id) return operation.id === "1000";

    const value = raw.afecto_inafecto ?? raw.afectoInafecto ?? raw.AfectoInafecto;
    return value === true || value === 1 || String(value).trim().toLowerCase() === "true";
};

export default function OrdenCompraImportModal({ isOpen, onClose, onImport }: Props) {
    const [searchTerm, setSearchTerm] = useState("");
    const [fromDate, setFromDate] = useState(initialFromDate);
    const [toDate, setToDate] = useState(() => dateInput(new Date()));
    const [page, setPage] = useState(1);
    const [orders, setOrders] = useState<OrdenCompraServicio[]>([]);
    const [totalRecords, setTotalRecords] = useState(0);
    const [loading, setLoading] = useState(false);
    const [loadingOrderId, setLoadingOrderId] = useState("");
    const [detailOpen, setDetailOpen] = useState(false);
    const [detailOrder, setDetailOrder] = useState<OrdenCompraServicio | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        setPage(1);
    }, [fromDate, isOpen, searchTerm, toDate]);

    useEffect(() => {
        if (!isOpen) return;
        let mounted = true;

        const timer = window.setTimeout(async () => {
            setLoading(true);
            try {
                const response = await ordenCompraServicioService.getAll(page, PAGE_SIZE, searchTerm, {
                    estado: ["APROBADO"],
                    fechaInicio: fromDate,
                    fechaFin: toDate
                });
                if (!mounted) return;
                if (!response.isSuccess) {
                    setOrders([]);
                    setTotalRecords(0);
                    toast.error(response.message || "No se pudieron obtener las órdenes aprobadas.");
                    return;
                }
                setOrders(response.data || []);
                setTotalRecords(Number(response.meta?.totalRecords || 0));
            } finally {
                if (mounted) setLoading(false);
            }
        }, 400);

        return () => {
            mounted = false;
            window.clearTimeout(timer);
        };
    }, [fromDate, isOpen, page, searchTerm, toDate]);

    const totalPages = Math.max(1, Math.ceil(totalRecords / PAGE_SIZE));

    const fetchFullOrder = async (order: OrdenCompraServicio) => {
        const id = orderIdOf(order);
        if (!id) {
            toast.error("No se pudo identificar la orden seleccionada.");
            return null;
        }

        setLoadingOrderId(id);
        try {
            const response = await ordenCompraServicioService.getById(id);
            if (!response.isSuccess || !response.data) {
                toast.error(response.message || "No se pudo cargar el detalle de la orden.");
                return null;
            }
            return response.data;
        } finally {
            setLoadingOrderId("");
        }
    };

    const handleView = async (order: OrdenCompraServicio) => {
        const fullOrder = await fetchFullOrder(order);
        if (!fullOrder) return;
        setDetailOrder(fullOrder);
        setDetailOpen(true);
    };

    const handleImport = async (order: OrdenCompraServicio) => {
        const fullOrder = await fetchFullOrder(order);
        if (!fullOrder) return;
        onImport(fullOrder);
    };

    const detailValues = useMemo(() => {
        if (!detailOrder) return null;
        const raw = detailOrder as Record<string, unknown>;
        const details = (detailOrder.detalles || detailOrder.Detalles || []) as OrdenCompraServicioDetalle[];
        const detailTotals = details.reduce((totals, detail) => {
            const amount = totalOfDetail(detail);
            if (isAffectedDetail(detail)) totals.affected += amount;
            else totals.exempt += amount;
            return totals;
        }, { affected: 0, exempt: 0 });
        const affected = details.length > 0
            ? detailTotals.affected
            : numberOf(raw.valorventa_afecto ?? raw.subtotalAfecto ?? raw.SubtotalAfecto);
        const exempt = details.length > 0
            ? detailTotals.exempt
            : numberOf(raw.valorventa_exonerado ?? raw.subtotalExonerado ?? raw.SubtotalExonerado);
        const igv = affected * 0.18;

        return {
            id: orderIdOf(detailOrder),
            number: orderNumberOf(detailOrder),
            provider: providerOf(detailOrder),
            currency: currencyOf(detailOrder),
            payment: paymentOf(detailOrder),
            date: displayDate(first(raw, ["fecha_emision", "fechaEmision", "FechaEmision"])),
            affected,
            exempt,
            igv,
            total: affected + exempt + igv,
            details
        };
    }, [detailOrder]);

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} title="Agregar Orden de Compra" size="lg">
                <div className="space-y-5">
                    <div className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 md:grid-cols-4">
                        <div className="md:col-span-2">
                            <label className="ml-1 text-[10px] font-bold uppercase text-slate-500">Proveedor o N° Orden</label>
                            <div className="relative">
                                <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input
                                    value={searchTerm}
                                    onChange={event => setSearchTerm(event.target.value)}
                                    placeholder="Buscar orden aprobada..."
                                    className="h-[38px] w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-xs outline-none focus:border-blue-500"
                                />
                                {loading && <IconLoader className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-blue-500" size={16} />}
                            </div>
                        </div>
                        <div>
                            <label className="ml-1 text-[10px] font-bold uppercase text-slate-500">Fecha inicial</label>
                            <input type="date" value={fromDate} max={toDate} onChange={event => setFromDate(event.target.value)} className="h-[38px] w-full rounded-lg border border-slate-300 bg-white px-2 text-xs outline-none focus:border-blue-500" />
                        </div>
                        <div>
                            <label className="ml-1 text-[10px] font-bold uppercase text-slate-500">Fecha final</label>
                            <input type="date" value={toDate} min={fromDate} onChange={event => setToDate(event.target.value)} className="h-[38px] w-full rounded-lg border border-slate-300 bg-white px-2 text-xs outline-none focus:border-blue-500" />
                        </div>
                    </div>

                    <div className="flex h-[330px] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white">
                        <div className="flex-1 overflow-auto">
                            <table className="w-full min-w-[820px] text-left text-xs">
                                <thead className="sticky top-0 z-10 bg-slate-900 text-white">
                                    <tr>
                                        <th className="p-3">ID</th>
                                        <th className="p-3">Fecha</th>
                                        <th className="p-3">N° Orden</th>
                                        <th className="p-3">Proveedor</th>
                                        <th className="p-3">Moneda</th>
                                        <th className="p-3">T. Pago</th>
                                        <th className="p-3 text-right">Subtotal</th>
                                        <th className="p-3 text-right">IGV</th>
                                        <th className="p-3 text-right">Total</th>
                                        <th className="p-3 text-center">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {!loading && orders.length === 0 ? (
                                        <tr><td colSpan={10} className="p-12 text-center italic text-slate-400">No se encontraron órdenes aprobadas en el rango indicado.</td></tr>
                                    ) : orders.map(order => {
                                        const raw = order as Record<string, unknown>;
                                        const id = orderIdOf(order);
                                        const isLoadingThis = loadingOrderId === id;
                                        return (
                                            <tr key={id} className="transition-colors hover:bg-slate-50">
                                                <td className="p-3 font-mono text-[11px] text-slate-600">{id}</td>
                                                <td className="p-3">{displayDate(first(raw, ["fecha_emision", "fechaEmision", "FechaEmision"]))}</td>
                                                <td className="p-3 font-mono font-bold text-blue-700">{orderNumberOf(order)}</td>
                                                <td className="max-w-[180px] truncate p-3" title={providerOf(order)}>{providerOf(order) || "-"}</td>
                                                <td className="p-3">{currencyOf(order) || "-"}</td>
                                                <td className="p-3">{paymentOf(order) || "-"}</td>
                                                <td className="p-3 text-right font-mono">{money(raw.subtotal)}</td>
                                                <td className="p-3 text-right font-mono">{money(raw.igv)}</td>
                                                <td className="p-3 text-right font-mono font-black text-emerald-700">{money(raw.total)}</td>
                                                <td className="p-3">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button type="button" onClick={() => handleView(order)} disabled={isLoadingThis} className="rounded border border-amber-200 bg-amber-50 p-1.5 text-amber-700 hover:bg-amber-100 disabled:opacity-50" title="Ver detalle"><IconEye size={16} /></button>
                                                        <button type="button" onClick={() => handleImport(order)} disabled={isLoadingThis} className="flex items-center gap-1 rounded border border-blue-200 bg-blue-50 px-2.5 py-1.5 font-bold text-blue-700 hover:bg-blue-100 disabled:opacity-50">{isLoadingThis ? <IconLoader className="animate-spin" size={14} /> : <IconDownload size={14} />} Importar</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-2 text-xs text-slate-600">
                        <span>Página <strong>{page}</strong> de <strong>{totalPages}</strong> ({totalRecords} órdenes)</span>
                        <div className="flex gap-1">
                            <button type="button" disabled={page <= 1 || loading} onClick={() => setPage(previous => previous - 1)} className="rounded border border-slate-200 bg-white p-1.5 disabled:opacity-40" title="Página anterior"><IconChevronLeft size={16} /></button>
                            <button type="button" disabled={page >= totalPages || loading} onClick={() => setPage(previous => previous + 1)} className="rounded border border-slate-200 bg-white p-1.5 disabled:opacity-40" title="Página siguiente"><IconChevronRight size={16} /></button>
                        </div>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={detailOpen} onClose={() => setDetailOpen(false)} title="Detalle de Orden de Compra" size="lg">
                {detailValues && (
                    <div className="space-y-5">
                        <div className="grid grid-cols-2 gap-3 rounded-lg border border-blue-100 bg-blue-50/50 p-4 md:grid-cols-4">
                            <div><p className="text-[10px] font-bold uppercase text-slate-400">Orden</p><p className="font-mono font-black text-blue-700">{detailValues.number}</p></div>
                            <div><p className="text-[10px] font-bold uppercase text-slate-400">Fecha</p><p className="font-semibold text-slate-700">{detailValues.date}</p></div>
                            <div className="col-span-2"><p className="text-[10px] font-bold uppercase text-slate-400">Proveedor</p><p className="font-semibold text-slate-700">{detailValues.provider}</p></div>
                            <div><p className="text-[10px] font-bold uppercase text-slate-400">Moneda</p><p className="font-semibold text-slate-700">{detailValues.currency}</p></div>
                            <div><p className="text-[10px] font-bold uppercase text-slate-400">Tipo pago</p><p className="font-semibold text-slate-700">{detailValues.payment}</p></div>
                            <div><p className="text-[10px] font-bold uppercase text-slate-400">ID</p><p className="font-mono text-slate-700">{detailValues.id}</p></div>
                        </div>

                        <div className="max-h-[300px] overflow-auto rounded-lg border border-slate-200">
                            <table className="w-full min-w-[700px] text-left text-xs">
                                <thead className="sticky top-0 bg-slate-100 text-slate-600"><tr><th className="p-3">#</th><th className="p-3">Producto</th><th className="p-3">Presentación</th><th className="p-3 text-right">Cantidad</th><th className="p-3 text-right">Costo</th><th className="p-3 text-right">Total</th></tr></thead>
                                <tbody className="divide-y divide-slate-100">
                                    {detailValues.details.map((detail, index) => {
                                        const raw = detail as Record<string, unknown>;
                                        const bien = nested(raw, ["bien", "Bien"]);
                                        const presentation = nested(raw, ["presentacion", "Presentacion"]);
                                        const operation = operationOfDetail(detail);
                                        return (
                                            <tr key={`${first(raw, ["bienId"])}-${first(raw, ["presentacionId"])}-${index}`}>
                                                <td className="p-3 text-slate-400">{index + 1}</td>
                                                <td className="p-3"><p className="font-bold text-slate-700">{first(bien, ["descripcion"]) || first(raw, ["bienId"])}</p><span className={`mt-1 inline-flex rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${operation.id === "1000" ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"}`}>{operation.label || (operation.id === "1000" ? "Gravada" : "Exonerado")}</span></td>
                                                <td className="p-3">{first(presentation, ["descripcion"]) || first(raw, ["presentacionId"])}</td>
                                                <td className="p-3 text-right font-mono">{money(raw.cantidad)}</td>
                                                <td className="p-3 text-right font-mono">{money(raw.costo)}</td>
                                                <td className="p-3 text-right font-mono font-black text-emerald-700">{money(totalOfDetail(detail))}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                            <div className="rounded-lg border border-slate-200 p-3"><p className="text-[10px] font-bold uppercase text-slate-400">Subtotal afecto</p><p className="font-mono text-lg font-black">S/ {money(detailValues.affected)}</p></div>
                            <div className="rounded-lg border border-slate-200 p-3"><p className="text-[10px] font-bold uppercase text-slate-400">Subtotal exonerado</p><p className="font-mono text-lg font-black">S/ {money(detailValues.exempt)}</p></div>
                            <div className="rounded-lg border border-slate-200 p-3"><p className="text-[10px] font-bold uppercase text-slate-400">IGV</p><p className="font-mono text-lg font-black">S/ {money(detailValues.igv)}</p></div>
                            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3"><p className="text-[10px] font-bold uppercase text-blue-600">Total</p><p className="font-mono text-lg font-black text-blue-700">S/ {money(detailValues.total)}</p></div>
                        </div>

                        <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                            <button type="button" onClick={() => setDetailOpen(false)} className="rounded-lg bg-slate-100 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200">Cerrar</button>
                            <button type="button" onClick={() => { setDetailOpen(false); if (detailOrder) onImport(detailOrder); }} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700"><IconShoppingCart size={16} /> Importar orden</button>
                        </div>
                    </div>
                )}
            </Modal>
        </>
    );
}
