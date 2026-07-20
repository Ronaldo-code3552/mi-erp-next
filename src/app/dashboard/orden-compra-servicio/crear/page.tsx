"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import OrdenCompraServicioForm from "../components/OrdenCompraServicioForm";
import { ordenCompraServicioService } from "@/services/ordenCompraServicioService";
import { OrdenCompraServicioPayload } from "@/types/ordenCompraServicio.types";

export default function CrearOrdenCompraServicioPage() {
    const router = useRouter();

    const handleSubmit = async (payload: OrdenCompraServicioPayload) => {
        const response = await ordenCompraServicioService.create(payload);

        if (!response.isSuccess) {
            toast.error(response.message || "No se pudo crear la orden.");
            return;
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
