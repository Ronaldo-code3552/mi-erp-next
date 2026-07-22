"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import DocumentoCompraForm from "../../components/DocumentoCompraForm";
import { documentoCompraService } from "@/services/documentoCompraService";
import { DocumentoCompra, DocumentoCompraPayload } from "@/types/documentoCompra.types";

export default function EditarDocumentoComercialPage() {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const id = String(params?.id || "");
    const readOnly = searchParams.get("mode") === "view";
    const [loading, setLoading] = useState(true);
    const [documento, setDocumento] = useState<DocumentoCompra | null>(null);

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

    const handleSubmit = async (payload: DocumentoCompraPayload) => {
        const response = await documentoCompraService.update(id, payload);
        if (!response.isSuccess) {
            toast.error(response.message || "No se pudo actualizar el documento.");
            return;
        }
        toast.success("Documento actualizado correctamente.");
        router.push("/dashboard/documento-comercial");
    };

    if (loading) return <div className="p-6 text-center text-sm text-slate-400">Cargando documento...</div>;
    if (!documento) return null;

    return <DocumentoCompraForm key={id} title={readOnly ? `Detalle Documento ${id}` : `Editar Documento ${id}`} submitText="Guardar cambios" initialValue={documento} readOnly={readOnly} onBack={() => router.push("/dashboard/documento-comercial")} onSubmit={handleSubmit} />;
}
