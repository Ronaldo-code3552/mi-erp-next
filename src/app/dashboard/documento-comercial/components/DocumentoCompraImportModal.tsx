"use client";

import { useEffect, useState } from "react";
import {
    IconChevronLeft,
    IconChevronRight,
    IconDownload,
    IconEye,
    IconLoader,
    IconSearch
} from "@tabler/icons-react";
import { toast } from "sonner";

import Modal from "@/components/ui/Modal";
import { documentoCompraService } from "@/services/documentoCompraService";
import { DocumentoCompra, DocumentoCompraDetalle } from "@/types/documentoCompra.types";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onImport: (document: DocumentoCompra) => void;
}

const PAGE_SIZE = 20;
const EMPRESA_ID = "005";
const INVOICE_DOCUMENT_TYPE = "X062";

const inputDate = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
};

const initialFromDate = () => {
    const date = new Date();
    date.setMonth(date.getMonth() - 1);
    return inputDate(date);
};

const first = (source: Record<string, unknown>, keys: string[]) => {
    for (const key of keys) {
        const value = source[key];
        if (value !== undefined && value !== null && String(value).trim() !== "") {
            return String(value).trim();
        }
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
    const parsed = new Date(String(value));
    return Number.isNaN(parsed.getTime()) ? "-" : parsed.toLocaleDateString("es-PE");
};

const documentIdOf = (document: DocumentoCompra) => first(document as Record<string, unknown>, [
    "documentocompraId",
    "documentoCompraId",
    "DocumentoCompraId"
]);

const documentNumberOf = (document: DocumentoCompra) => {
    const raw = document as Record<string, unknown>;
    const serie = first(raw, ["serie", "Serie"]);
    const numero = first(raw, ["numero", "Numero"]);
    return [serie, numero].filter(Boolean).join("-") || documentIdOf(document);
};

const providerOf = (document: DocumentoCompra) => {
    const raw = document as Record<string, unknown>;
    return first(nested(raw, ["proveedor", "Proveedor"]), ["descripcion", "Descripcion"])
        || first(raw, ["proveedorId", "ProveedorId"]);
};

const currencyOf = (document: DocumentoCompra) => {
    const raw = document as Record<string, unknown>;
    return first(nested(raw, ["moneda", "Moneda"]), ["descripcion", "abreviatura", "simbolomoneda"])
        || first(raw, ["monedaId", "MonedaId"]);
};

const paymentOf = (document: DocumentoCompra) => {
    const raw = document as Record<string, unknown>;
    return first(nested(raw, ["tipoPago", "TipoPago"]), ["descripcion", "Descripcion"])
        || first(raw, ["tipopagoId", "tipoPagoId", "TipoPagoId"]);
};

const affectedOf = (document: DocumentoCompra) => {
    const raw = document as Record<string, unknown>;
    return numberOf(raw.valorventa_afecto ?? raw.valorventaAfecto ?? raw.valorVentaAfecto);
};

const exemptOf = (document: DocumentoCompra) => {
    const raw = document as Record<string, unknown>;
    return numberOf(raw.valorventa_exonerado ?? raw.valorventaExonerado ?? raw.valorVentaExonerado);
};

export default function DocumentoCompraImportModal({ isOpen, onClose, onImport }: Props) {
    const [searchTerm, setSearchTerm] = useState("");
    const [fromDate, setFromDate] = useState(initialFromDate);
    const [toDate, setToDate] = useState(() => inputDate(new Date()));
    const [page, setPage] = useState(1);
    const [documents, setDocuments] = useState<DocumentoCompra[]>([]);
    const [totalRecords, setTotalRecords] = useState(0);
    const [loading, setLoading] = useState(false);
    const [loadingId, setLoadingId] = useState("");
    const [detailDocument, setDetailDocument] = useState<DocumentoCompra | null>(null);

    useEffect(() => {
        if (isOpen) setPage(1);
    }, [fromDate, isOpen, searchTerm, toDate]);

    useEffect(() => {
        if (!isOpen) return;
        let mounted = true;

        const timer = window.setTimeout(async () => {
            setLoading(true);
            try {
                const response = await documentoCompraService.getByEmpresa(EMPRESA_ID, page, PAGE_SIZE, searchTerm, {
                    tipo_documento: [INVOICE_DOCUMENT_TYPE],
                    fecha_inicio: fromDate,
                    fecha_fin: toDate,
                    estados_excluidos: ["ANULADO"]
                });
                if (!mounted) return;
                if (!response.isSuccess) {
                    setDocuments([]);
                    setTotalRecords(0);
                    toast.error(response.message || "No se pudieron obtener las facturas.");
                    return;
                }
                setDocuments(response.data || []);
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

    const getFullDocument = async (document: DocumentoCompra) => {
        const id = documentIdOf(document);
        if (!id) {
            toast.error("No se pudo identificar el documento seleccionado.");
            return null;
        }

        setLoadingId(id);
        try {
            const response = await documentoCompraService.getById(id);
            if (!response.isSuccess || !response.data) {
                toast.error(response.message || "No se pudo cargar el detalle del documento.");
                return null;
            }
            return response.data;
        } finally {
            setLoadingId("");
        }
    };

    const showDetail = async (document: DocumentoCompra) => {
        const fullDocument = await getFullDocument(document);
        if (fullDocument) setDetailDocument(fullDocument);
    };

    const importDocument = async (document: DocumentoCompra) => {
        const fullDocument = await getFullDocument(document);
        if (fullDocument) onImport(fullDocument);
    };

    const details = (detailDocument?.detalles || []) as DocumentoCompraDetalle[];

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} title="Agregar Documento de Compra" size="lg">
                <div className="space-y-5">
                    <div className="grid grid-cols-1 gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 md:grid-cols-4">
                        <div className="md:col-span-2">
                            <label className="ml-1 text-[10px] font-bold uppercase text-slate-500">Proveedor, serie o número</label>
                            <div className="relative">
                                <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input
                                    value={searchTerm}
                                    onChange={event => setSearchTerm(event.target.value)}
                                    placeholder="Buscar factura de compra..."
                                    className="h-[38px] w-full rounded-lg border border-slate-300 bg-white pl-9 pr-9 text-xs outline-none focus:border-blue-500"
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

                    <div className="flex h-[340px] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white">
                        <div className="flex-1 overflow-auto">
                            <table className="w-full min-w-[850px] text-left text-xs">
                                <thead className="sticky top-0 z-10 bg-slate-900 text-white">
                                    <tr>
                                        <th className="p-3">ID</th>
                                        <th className="p-3">Fecha</th>
                                        <th className="p-3">Documento</th>
                                        <th className="p-3">Proveedor</th>
                                        <th className="p-3">Moneda</th>
                                        <th className="p-3">T. Pago</th>
                                        <th className="p-3 text-right">Afecto</th>
                                        <th className="p-3 text-right">Exonerado</th>
                                        <th className="p-3 text-right">Total</th>
                                        <th className="p-3 text-center">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {!loading && documents.length === 0 ? (
                                        <tr><td colSpan={10} className="p-12 text-center italic text-slate-400">No se encontraron facturas en el rango indicado.</td></tr>
                                    ) : documents.map(document => {
                                        const raw = document as Record<string, unknown>;
                                        const id = documentIdOf(document);
                                        const isLoading = loadingId === id;
                                        return (
                                            <tr key={id} className="hover:bg-slate-50">
                                                <td className="p-3 font-mono text-[11px] text-slate-600">{id}</td>
                                                <td className="p-3">{displayDate(raw.fechaDoc ?? raw.fecha_doc ?? raw.fechaEmision ?? raw.fecha_emision)}</td>
                                                <td className="p-3 font-mono font-bold text-blue-700">{documentNumberOf(document)}</td>
                                                <td className="max-w-[180px] truncate p-3" title={providerOf(document)}>{providerOf(document) || "-"}</td>
                                                <td className="p-3">{currencyOf(document) || "-"}</td>
                                                <td className="p-3">{paymentOf(document) || "-"}</td>
                                                <td className="p-3 text-right font-mono">{money(affectedOf(document))}</td>
                                                <td className="p-3 text-right font-mono">{money(exemptOf(document))}</td>
                                                <td className="p-3 text-right font-mono font-black text-emerald-700">{money(raw.total)}</td>
                                                <td className="p-3">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button type="button" onClick={() => showDetail(document)} disabled={isLoading} className="rounded border border-amber-200 bg-amber-50 p-1.5 text-amber-700 hover:bg-amber-100 disabled:opacity-50" title="Ver detalle"><IconEye size={16} /></button>
                                                        <button type="button" onClick={() => importDocument(document)} disabled={isLoading} className="flex items-center gap-1 rounded border border-blue-200 bg-blue-50 px-2.5 py-1.5 font-bold text-blue-700 hover:bg-blue-100 disabled:opacity-50">{isLoading ? <IconLoader className="animate-spin" size={14} /> : <IconDownload size={14} />} Importar</button>
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
                        <span>Página <strong>{page}</strong> de <strong>{totalPages}</strong> ({totalRecords} facturas)</span>
                        <div className="flex gap-1">
                            <button type="button" disabled={page <= 1 || loading} onClick={() => setPage(previous => previous - 1)} className="rounded border border-slate-200 bg-white p-1.5 disabled:opacity-40" title="Página anterior"><IconChevronLeft size={16} /></button>
                            <button type="button" disabled={page >= totalPages || loading} onClick={() => setPage(previous => previous + 1)} className="rounded border border-slate-200 bg-white p-1.5 disabled:opacity-40" title="Página siguiente"><IconChevronRight size={16} /></button>
                        </div>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={Boolean(detailDocument)} onClose={() => setDetailDocument(null)} title="Detalle del Documento de Compra" size="lg">
                {detailDocument && (
                    <div className="space-y-5">
                        <div className="grid grid-cols-2 gap-3 rounded-lg border border-blue-100 bg-blue-50/50 p-4 md:grid-cols-4">
                            <div><p className="text-[10px] font-bold uppercase text-slate-400">Documento</p><p className="font-mono font-black text-blue-700">{documentNumberOf(detailDocument)}</p></div>
                            <div><p className="text-[10px] font-bold uppercase text-slate-400">Proveedor</p><p className="font-semibold text-slate-700">{providerOf(detailDocument)}</p></div>
                            <div><p className="text-[10px] font-bold uppercase text-slate-400">Moneda</p><p className="font-semibold text-slate-700">{currencyOf(detailDocument)}</p></div>
                            <div><p className="text-[10px] font-bold uppercase text-slate-400">Tipo pago</p><p className="font-semibold text-slate-700">{paymentOf(detailDocument)}</p></div>
                        </div>

                        <div className="max-h-[300px] overflow-auto rounded-lg border border-slate-200">
                            <table className="w-full min-w-[700px] text-left text-xs">
                                <thead className="sticky top-0 bg-slate-100 text-slate-600"><tr><th className="p-3">#</th><th className="p-3">Producto</th><th className="p-3">Presentación</th><th className="p-3 text-right">Cantidad</th><th className="p-3 text-right">Costo</th><th className="p-3 text-right">Total</th></tr></thead>
                                <tbody className="divide-y divide-slate-100">
                                    {details.map((detail, index) => {
                                        const raw = detail as Record<string, unknown>;
                                        const product = nested(raw, ["bien", "Bien"]);
                                        const presentation = nested(raw, ["presentacion", "Presentacion"]);
                                        return (
                                            <tr key={`${first(raw, ["bienId"])}-${first(raw, ["presentacionId"])}-${index}`}>
                                                <td className="p-3 text-slate-400">{index + 1}</td>
                                                <td className="p-3 font-bold text-slate-700">{first(product, ["descripcion"]) || first(raw, ["bienId"])}</td>
                                                <td className="p-3">{first(presentation, ["descripcion"]) || first(raw, ["presentacionId"])}</td>
                                                <td className="p-3 text-right font-mono">{money(raw.cantidad)}</td>
                                                <td className="p-3 text-right font-mono">{money(raw.costo)}</td>
                                                <td className="p-3 text-right font-mono font-black text-emerald-700">{money(raw.importe)}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                            <div className="rounded-lg border border-slate-200 p-3"><p className="text-[10px] font-bold uppercase text-slate-400">Subtotal afecto</p><p className="font-mono text-lg font-black">S/ {money(affectedOf(detailDocument))}</p></div>
                            <div className="rounded-lg border border-slate-200 p-3"><p className="text-[10px] font-bold uppercase text-slate-400">Subtotal exonerado</p><p className="font-mono text-lg font-black">S/ {money(exemptOf(detailDocument))}</p></div>
                            <div className="rounded-lg border border-slate-200 p-3"><p className="text-[10px] font-bold uppercase text-slate-400">IGV</p><p className="font-mono text-lg font-black">S/ {money(detailDocument.igv)}</p></div>
                            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3"><p className="text-[10px] font-bold uppercase text-blue-600">Total</p><p className="font-mono text-lg font-black text-blue-700">S/ {money(detailDocument.total)}</p></div>
                        </div>

                        <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
                            <button type="button" onClick={() => setDetailDocument(null)} className="rounded-lg bg-slate-100 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200">Cerrar</button>
                            <button type="button" onClick={() => { onImport(detailDocument); setDetailDocument(null); }} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700"><IconDownload size={16} /> Importar documento</button>
                        </div>
                    </div>
                )}
            </Modal>
        </>
    );
}
