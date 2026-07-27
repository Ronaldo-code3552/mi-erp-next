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

export default function EditarDocumentoComercialPage() {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const id = String(params?.id || "");
    const readOnly = searchParams.get("mode") === "view";
    const [loading, setLoading] = useState(true);
    const [documento, setDocumento] = useState<DocumentoCompra | null>(null);
    const estadoDocumento = String(documento?.estado || "").trim().toUpperCase();

    useEffect(() => {
        const load = async () => {
            const response = await documentoCompraService.getById(id);
            if (!response.isSuccess || !response.data) {
                toast.error(response.message || "No se pudo cargar el documento.");
                router.push("/dashboard/documento-comercial");
                return;
            }
            setDocumento(response.data);
            setLoading(false);
        };
        if (id) load();
    }, [id, router]);

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
    if (!documento) return null;

    const effectiveReadOnly = readOnly || estadoDocumento !== "REGISTRADO";

    return <DocumentoCompraForm key={id} title={effectiveReadOnly ? `Detalle Documento ${id}` : `Editar Documento ${id}`} submitText="Guardar cambios" initialValue={documento} readOnly={effectiveReadOnly} onBack={() => router.push("/dashboard/documento-comercial")} onSubmit={handleSubmit} />;
}
