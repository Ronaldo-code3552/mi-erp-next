"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import DocumentoCompraForm from "../components/DocumentoCompraForm";
import { documentoCompraService } from "@/services/documentoCompraService";
import { DocumentoCompraPayload } from "@/types/documentoCompra.types";

export default function CrearDocumentoComercialPage() {
    const router = useRouter();
    const handleSubmit = async (payload: DocumentoCompraPayload) => {
        const response = await documentoCompraService.create(payload);
        if (!response.isSuccess) {
            toast.error(response.message || "No se pudo crear el documento.");
            return;
        }
        toast.success("Documento registrado correctamente.");
        router.push("/dashboard/documento-comercial");
    };

    return <DocumentoCompraForm title="Nuevo Documento de Compra" submitText="Guardar" onBack={() => router.push("/dashboard/documento-comercial")} onSubmit={handleSubmit} />;
}
