"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import SolicitudReposicionForm from "../components/SolicitudReposicionForm";
import { solicitudReposicionService } from "@/services/solicitudReposicionService";
import { SolicitudReposicionCreatePayload } from "@/types/solicitudReposicion.types";

const todayString = () => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
};

export default function CrearSolicitudReposicionPage() {
    const router = useRouter();

    const handleSubmit = async (payload: SolicitudReposicionCreatePayload) => {
        const response = await solicitudReposicionService.create(payload);

        if (!response.isSuccess) {
            toast.error(response.message || "No se pudo crear la solicitud.");
            return;
        }

        toast.success("Solicitud de reposición creada correctamente.");
        router.push("/dashboard/solicitudes-reposicion");
    };

    return (
        <SolicitudReposicionForm
            title="Nueva Solicitud de Reposición"
            subtitle="Cree una solicitud con cabecera y detalle de productos."
            submitText="Crear solicitud"
            initialValue={{
                almacen_origenId: "",
                almacen_destinoId: "",
                fecha_plazo_solicitud: todayString(),
                observacion: "",
                cuentausuarioId: "CU0001",
                detalle: []
            }}
            onBack={() => router.push("/dashboard/solicitudes-reposicion")}
            onSubmit={handleSubmit}
        />
    );
}
