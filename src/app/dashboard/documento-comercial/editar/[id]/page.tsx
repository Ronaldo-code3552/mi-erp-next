"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import DocumentoCompraForm from "../../components/DocumentoCompraForm";
import {
    documentoPdfService,
    formatDocumentoPdfUploadFailures
} from "@/services/documentoPdfService";
import { documentoCompraService } from "@/services/documentoCompraService";
import { DocumentoCompra, DocumentoCompraPayload } from "@/types/documentoCompra.types";
import { DOCUMENTO_PDF_REFERENCIAS } from "@/types/documentoPdf.types";
import { getSafeDashboardReturnPath } from "@/utils/referenciasUso";

export default function EditarDocumentoComercialPage() {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const id = String(params?.id || "");
    const readOnly = searchParams.get("mode") === "view";
    const returnPath = getSafeDashboardReturnPath(
        searchParams.get("returnTo"),
        "/dashboard/documento-comercial"
    );
    const hasReturnContext = Boolean(searchParams.get("returnTo"));
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [documento, setDocumento] = useState<DocumentoCompra | null>(null);
    const estadoDocumento = String(documento?.estado || "").trim().toUpperCase();
    const handleBack = () => {
        if (hasReturnContext) {
            router.push(returnPath);
            return;
        }

        if (window.history.length > 1) {
            router.back();
            return;
        }

        router.push("/dashboard/documento-comercial");
    };

    useEffect(() => {
        const load = async () => {
            setLoadError("");
            const response = await documentoCompraService.getById(id);
            if (!response.isSuccess || !response.data) {
                const message = "No se pudo obtener el detalle del documento referenciado.";
                toast.error(message);
                setLoadError(message);
                setLoading(false);
                return;
            }
            setDocumento(response.data);
            setLoading(false);
        };
        if (id) load();
    }, [id]);

    const handleSubmit = async (
        payload: DocumentoCompraPayload,
        archivosPendientes: File[]
    ) => {
        if (estadoDocumento !== "REGISTRADO") {
            toast.error("Solo los documentos con estado REGISTRADO se pueden editar.");
            return;
        }

        const response = await documentoCompraService.update(id, payload);
        if (!response.isSuccess) {
            toast.error(response.message || "No se pudo actualizar el documento.");
            return;
        }

        if (archivosPendientes.length > 0) {
            const uploadResult = await documentoPdfService.uploadSequentially(
                DOCUMENTO_PDF_REFERENCIAS.DOCUMENTO_COMPRA,
                id,
                archivosPendientes
            );

            if (uploadResult.fallidos.length > 0) {
                toast.warning(
                    `El documento se actualizó, pero ${uploadResult.fallidos.length} archivo(s) no pudieron cargarse:\n${formatDocumentoPdfUploadFailures(uploadResult)}`
                );
                return {
                    archivosPendientes: uploadResult.fallidos.map(item => item.archivo),
                    refreshAdjuntos: uploadResult.exitosos.length > 0
                };
            }
        }

        toast.success("Documento actualizado correctamente.");
        router.push("/dashboard/documento-comercial");
    };

    if (loading) return <div className="p-6 text-center text-sm text-slate-400">Cargando documento...</div>;
    if (loadError) {
        return (
            <div className="p-6">
                <div className="mx-auto max-w-xl rounded-lg border border-red-200 bg-white p-6 text-center shadow-sm">
                    <p className="text-sm font-bold text-red-700">{loadError}</p>
                    <p className="mt-1 text-xs text-slate-500">El documento referenciado ya no está disponible.</p>
                    <button
                        type="button"
                        onClick={handleBack}
                        className="mt-5 rounded-lg bg-slate-800 px-4 py-2 text-xs font-bold text-white hover:bg-slate-700"
                    >
                        Volver
                    </button>
                </div>
            </div>
        );
    }
    if (!documento) return null;

    const effectiveReadOnly = readOnly || estadoDocumento !== "REGISTRADO";

    return <DocumentoCompraForm key={id} title={effectiveReadOnly ? `Detalle Documento ${id}` : `Editar Documento ${id}`} submitText="Guardar cambios" initialValue={documento} readOnly={effectiveReadOnly} showReferencedDocuments={readOnly} onBack={handleBack} onSubmit={handleSubmit} />;
}
