"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import OrdenCompraServicioForm from "../components/OrdenCompraServicioForm";
import {
    documentoPdfService,
    formatDocumentoPdfUploadFailures
} from "@/services/documentoPdfService";
import { ordenCompraServicioService } from "@/services/ordenCompraServicioService";
import { OrdenCompraServicioPayload } from "@/types/ordenCompraServicio.types";
import { DOCUMENTO_PDF_REFERENCIAS } from "@/types/documentoPdf.types";

export default function CrearOrdenCompraServicioPage() {
    const router = useRouter();

    const handleSubmit = async (
        payload: OrdenCompraServicioPayload,
        archivosPendientes: File[]
    ) => {
        const response = await ordenCompraServicioService.create(payload);

        if (!response.isSuccess) {
            toast.error(response.message || "No se pudo crear la orden.");
            return;
        }

        const ordenId = response.data.ordenCompraServicioId;
        if (!ordenId) {
            toast.warning(
                "La orden se registró, pero el backend no devolvió su ID. Los archivos no pudieron vincularse."
            );
            router.push("/dashboard/orden-compra-servicio");
            return;
        }

        if (archivosPendientes.length > 0) {
            const uploadResult = await documentoPdfService.uploadSequentially(
                DOCUMENTO_PDF_REFERENCIAS.ORDEN_COMPRA_SERVICIO,
                ordenId,
                archivosPendientes
            );

            if (uploadResult.fallidos.length > 0) {
                toast.warning(
                    `La orden se registró, pero ${uploadResult.fallidos.length} archivo(s) no pudieron cargarse:\n${formatDocumentoPdfUploadFailures(uploadResult)}`
                );
                router.push(`/dashboard/orden-compra-servicio/editar/${ordenId}`);
                return {
                    archivosPendientes: uploadResult.fallidos.map(item => item.archivo)
                };
            }
        }

        toast.success("Orden registrada correctamente.");
        router.push("/dashboard/orden-compra-servicio");
    };

    return (
        <OrdenCompraServicioForm
            title="Registrar Orden Compra/Servicio"
            subtitle="Cree una nueva orden para compras o servicios."
            submitText="Grabar"
            onBack={() => router.push("/dashboard/orden-compra-servicio")}
            onSubmit={handleSubmit}
        />
    );
}
