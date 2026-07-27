"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import DocumentoCompraForm from "../components/DocumentoCompraForm";
import {
    documentoPdfService,
    formatDocumentoPdfUploadFailures
} from "@/services/documentoPdfService";
import { documentoCompraService } from "@/services/documentoCompraService";
import { DocumentoCompraPayload } from "@/types/documentoCompra.types";
import { DOCUMENTO_PDF_REFERENCIAS } from "@/types/documentoPdf.types";

export default function CrearDocumentoComercialPage() {
    const router = useRouter();
    const handleSubmit = async (
        payload: DocumentoCompraPayload,
        archivosPendientes: File[]
    ) => {
        const response = await documentoCompraService.create(payload);
        if (!response.isSuccess) {
            toast.error(response.message || "No se pudo crear el documento.");
            return;
        }

        const documentoId = response.data.documentoCompraId;
        if (!documentoId) {
            toast.warning(
                "El documento se registró, pero el backend no devolvió su ID. Los archivos no pudieron vincularse."
            );
            router.push("/dashboard/documento-comercial");
            return;
        }

        if (archivosPendientes.length > 0) {
            const uploadResult = await documentoPdfService.uploadSequentially(
                DOCUMENTO_PDF_REFERENCIAS.DOCUMENTO_COMPRA,
                documentoId,
                archivosPendientes
            );

            if (uploadResult.fallidos.length > 0) {
                toast.warning(
                    `El documento se registró, pero ${uploadResult.fallidos.length} archivo(s) no pudieron cargarse:\n${formatDocumentoPdfUploadFailures(uploadResult)}`
                );
                router.push(`/dashboard/documento-comercial/editar/${documentoId}`);
                return {
                    archivosPendientes: uploadResult.fallidos.map(item => item.archivo)
                };
            }
        }

        toast.success("Documento registrado correctamente.");
        router.push("/dashboard/documento-comercial");
    };

    return <DocumentoCompraForm title="Nuevo Documento de Compra" submitText="Guardar" onBack={() => router.push("/dashboard/documento-comercial")} onSubmit={handleSubmit} />;
}
