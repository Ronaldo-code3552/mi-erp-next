"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import { toast } from "sonner";
import {
    IconBan,
    IconCirclePlus,
    IconEdit,
    IconEye,
    IconPaperclip,
    IconRefresh,
    IconSearch
} from "@tabler/icons-react";

import DataTable from "@/components/shared/DataTable";
import DocumentoAdjuntosViewerModal from "@/components/documentos/DocumentoAdjuntosViewerModal";
import { useCrud } from "@/hooks/useCrud";
import { useDebounce } from "@/hooks/useDebounce";
import { documentoCompraService } from "@/services/documentoCompraService";
import { DocumentoCompra } from "@/types/documentoCompra.types";
import { DOCUMENTO_PDF_REFERENCIAS } from "@/types/documentoPdf.types";

const valueOf = (row: DocumentoCompra, keys: string[]) => {
    const raw = row as Record<string, unknown>;
    for (const key of keys) {
        const value = raw[key];
        if (value !== undefined && value !== null && String(value).trim() !== "") return value;
    }
    return "";
};

const stringOf = (row: DocumentoCompra, keys: string[]) => String(valueOf(row, keys) || "").trim();
const documentId = (row: DocumentoCompra) => stringOf(row, ["documentocompraId", "documentoCompraId", "DocumentoCompraId"]);
const estadoOf = (row: DocumentoCompra) => stringOf(row, ["estado", "Estado"]) || "REGISTRADO";

const money = (value: unknown) => new Intl.NumberFormat("es-PE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
}).format(Number(value || 0));

const date = (value: unknown) => {
    if (!value) return "-";
    const parsed = new Date(String(value));
    return Number.isNaN(parsed.getTime()) ? "-" : parsed.toLocaleDateString("es-PE");
};

const badgeClass = (estado: string) => {
    const normalized = estado.toUpperCase();
    if (normalized.includes("ANUL")) return "border-red-200 bg-red-50 text-red-700";
    if (normalized.includes("PAG")) return "border-emerald-200 bg-emerald-50 text-emerald-700";
    return "border-blue-200 bg-blue-50 text-blue-700";
};

export default function DocumentoComercialPage() {
    const router = useRouter();
    const { data, loading, meta, searchTerm, setSearchTerm, filters, fetchData } = useCrud<DocumentoCompra>(
        documentoCompraService,
        null,
        {}
    );
    const debouncedSearch = useDebounce(searchTerm, 500);
    const [adjuntosDocumentoId, setAdjuntosDocumentoId] = useState("");

    useEffect(() => {
        fetchData(1, debouncedSearch, filters);
    }, [debouncedSearch, fetchData, filters]);

    const handleAnular = async (row: DocumentoCompra) => {
        const id = documentId(row);
        if (!id || estadoOf(row).trim().toUpperCase() !== "REGISTRADO") return;

        const result = await Swal.fire({
            title: "¿Anular documento?",
            text: `Se anulará el documento ${id}.`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Anular",
            cancelButtonText: "Cancelar",
            confirmButtonColor: "#dc2626"
        });
        if (!result.isConfirmed) return;

        const response = await documentoCompraService.anular(id);
        if (!response.isSuccess) {
            toast.error(response.message || "No se pudo anular el documento.");
            return;
        }
        toast.success("Documento anulado correctamente.");
        fetchData(meta.currentPage, searchTerm, filters);
    };

    const columns = [
        { header: "Id", width: "130px", render: (row: DocumentoCompra) => <span className="font-mono font-bold text-blue-700">{documentId(row) || "-"}</span> },
        { header: "Fecha Doc", width: "105px", render: (row: DocumentoCompra) => date(valueOf(row, ["fechaDoc", "fecha_doc", "FechaDoc", "fechaEmision", "fecha_emision"])) },
        { header: "Tipo Doc", width: "145px", render: (row: DocumentoCompra) => row.tipoDocumentoComercial?.descripcion || row.tipoDocumento?.descripcion || stringOf(row, ["tipodoccomercialDescripcion", "tipoDocumentoDescripcion", "tipodoccomercialId"]) || "-" },
        { header: "Serie", width: "80px", render: (row: DocumentoCompra) => row.serie || "-" },
        { header: "Número", width: "110px", render: (row: DocumentoCompra) => row.numero || "-" },
        { header: "Proveedor", width: "190px", render: (row: DocumentoCompra) => row.proveedor?.descripcion || row.proveedorId || "-" },
        { header: "Moneda", width: "100px", render: (row: DocumentoCompra) => row.moneda?.descripcion || row.moneda?.abreviatura || row.monedaId || "-" },
        { header: "T. Pago", width: "120px", render: (row: DocumentoCompra) => row.tipoPago?.descripcion || row.tipopagoId || row.tipoPagoId || "-" },
        // { header: "Total Afecto", width: "115px", className: "text-right", render: (row: DocumentoCompra) => money(valueOf(row, ["valorventaAfecto", "valorVentaAfecto", "valorventa_afecto"])) },
        // { header: "Total Inafecto", width: "125px", className: "text-right", render: (row: DocumentoCompra) => money(valueOf(row, ["valorventaExonerado", "valorVentaExonerado", "valorventa_exonerado", "valorventaInafecto", "valorventa_inafecto"])) },
        // { header: "IGV", width: "90px", className: "text-right", render: (row: DocumentoCompra) => money(row.igv) },
        { header: "Total", width: "105px", className: "text-right", render: (row: DocumentoCompra) => <span className="font-bold text-emerald-700">{money(row.total)}</span> },
        { header: "Estado", width: "110px", className: "text-center", render: (row: DocumentoCompra) => <span className={`inline-flex rounded border px-2 py-1 text-[10px] font-bold ${badgeClass(estadoOf(row))}`}>{estadoOf(row)}</span> },
        {
            header: "Acciones",
            width: "150px",
            className: "text-center",
            render: (row: DocumentoCompra) => {
                const id = documentId(row);
                const canManage = estadoOf(row).trim().toUpperCase() === "REGISTRADO";
                return (
                    <div className="flex items-center justify-center gap-1">
                        <button type="button" onClick={() => id && router.push(`/dashboard/documento-comercial/editar/${id}?mode=view`)} className="rounded p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600" title="Ver detalle"><IconEye size={17} /></button>
                        <button type="button" disabled={!id} onClick={() => id && setAdjuntosDocumentoId(id)} className="rounded p-1.5 text-slate-400 hover:bg-amber-50 hover:text-amber-600 disabled:cursor-not-allowed disabled:opacity-35" title="Ver archivos adjuntos"><IconPaperclip size={17} /></button>
                        <button type="button" disabled={!canManage} onClick={() => id && router.push(`/dashboard/documento-comercial/editar/${id}`)} className="rounded p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-35" title={canManage ? "Editar" : "Solo los documentos registrados se pueden editar"}><IconEdit size={17} /></button>
                        <button type="button" disabled={!canManage} onClick={() => handleAnular(row)} className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-35" title={canManage ? "Anular" : "Solo los documentos registrados se pueden anular"}><IconBan size={17} /></button>
                    </div>
                );
            }
        }
    ];

    return (
        <div className="p-6 animate-fade-in-up">
            <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Documento Comercial</h1>
                    <p className="text-sm text-slate-500">Gestión de documentos de compra.</p>
                </div>
                <div className="flex gap-2">
                    <button type="button" onClick={() => fetchData(meta.currentPage, searchTerm, filters)} className="rounded-lg border border-slate-300 bg-white p-2.5 shadow-sm hover:text-blue-600" title="Actualizar"><IconRefresh size={20} className={loading ? "animate-spin" : ""} /></button>
                    <button type="button" onClick={() => router.push("/dashboard/documento-comercial/crear")} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 font-bold text-white shadow-lg shadow-blue-200 hover:bg-blue-700"><IconCirclePlus size={20} /> Nuevo Documento</button>
                </div>
            </div>
            <div className="relative mb-4">
                <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input value={searchTerm} onChange={event => setSearchTerm(event.target.value)} placeholder="Buscar por ID, serie, número o proveedor..." className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm outline-none focus:border-blue-500" />
            </div>
            <DataTable columns={columns} data={data} loading={loading} meta={meta} onPageChange={page => fetchData(page, searchTerm, filters)} emptyMessage="No se encontraron documentos comerciales" />
            <DocumentoAdjuntosViewerModal
                isOpen={Boolean(adjuntosDocumentoId)}
                onClose={() => setAdjuntosDocumentoId("")}
                referenciaId={adjuntosDocumentoId}
                referenciaTabla={DOCUMENTO_PDF_REFERENCIAS.DOCUMENTO_COMPRA}
                title={`Adjuntos del documento ${adjuntosDocumentoId}`}
            />
        </div>
    );
}
