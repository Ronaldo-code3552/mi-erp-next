"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import OrdenCompraServicioForm from "../../components/OrdenCompraServicioForm";
import {
    documentoPdfService,
    formatDocumentoPdfUploadFailures
} from "@/services/documentoPdfService";
import { ordenCompraServicioService } from "@/services/ordenCompraServicioService";
import { OrdenCompraServicio, OrdenCompraServicioPayload } from "@/types/ordenCompraServicio.types";
import { DOCUMENTO_PDF_REFERENCIAS } from "@/types/documentoPdf.types";

export default function EditarOrdenCompraServicioPage() {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const id = String(params?.id || "");
    const isViewMode = searchParams.get("mode") === "view";

    const [loading, setLoading] = useState(true);
    const [orden, setOrden] = useState<OrdenCompraServicio | null>(null);

    useEffect(() => {
        const fetchOrden = async () => {
            if (!id) return;

            setLoading(true);

            try {
                const response = await ordenCompraServicioService.getById(id);

                if (!response.isSuccess) {
                    toast.error(response.message || "No se pudo cargar la orden.");
                    router.push("/dashboard/orden-compra-servicio");
                    return;
                }

                setOrden(response.data || null);
            } finally {
                setLoading(false);
            }
        };

        fetchOrden();
    }, [id, router]);

    const handleSubmit = async (
        payload: OrdenCompraServicioPayload,
        archivosPendientes: File[]
    ) => {
        const response = await ordenCompraServicioService.update({
            ...payload,
            ordenCompraServicioId: id
        });

        if (!response.isSuccess) {
            toast.error(response.message || "No se pudo actualizar la orden.");
            return;
        }

        if (archivosPendientes.length > 0) {
            const uploadResult = await documentoPdfService.uploadSequentially(
                DOCUMENTO_PDF_REFERENCIAS.ORDEN_COMPRA_SERVICIO,
                id,
                archivosPendientes
            );

            if (uploadResult.fallidos.length > 0) {
                toast.warning(
                    `La orden se actualizó, pero ${uploadResult.fallidos.length} archivo(s) no pudieron cargarse:\n${formatDocumentoPdfUploadFailures(uploadResult)}`
                );
                return {
                    archivosPendientes: uploadResult.fallidos.map(item => item.archivo),
                    refreshAdjuntos: uploadResult.exitosos.length > 0
                };
            }
        }

        toast.success("Orden actualizada correctamente.");
        router.push("/dashboard/orden-compra-servicio");
    };

    if (loading) {
        return (
            <div className="p-6">
                <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
                    Cargando orden...
                </div>
            </div>
        );
    }

    if (!orden) {
        return (
            <div className="p-6">
                <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
                    No se encontró la orden.
                </div>
            </div>
        );
    }

    return (
        <OrdenCompraServicioForm
            key={id}
            title={isViewMode ? `Detalle Orden ${id}` : `Editar Orden ${id}`}
            subtitle={isViewMode ? "Consulta de información de la orden." : "Actualice la información permitida de la orden."}
            submitText="Guardar cambios"
            initialValue={orden}
            readOnly={isViewMode}
            onBack={() => router.push("/dashboard/orden-compra-servicio")}
            onSubmit={handleSubmit}
        />
    );
}
