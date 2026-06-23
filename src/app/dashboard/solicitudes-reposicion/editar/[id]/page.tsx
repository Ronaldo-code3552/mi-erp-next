"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import SolicitudReposicionForm, {
    SolicitudReposicionReadonlyInfo,
    SolicitudReposicionFormValue
} from "../../components/SolicitudReposicionForm";

import { solicitudReposicionService } from "@/services/solicitudReposicionService";
import {
    SolicitudReposicionCreatePayload,
    SolicitudReposicionResponse,
    SolicitudReposicionUpdatePayload
} from "@/types/solicitudReposicion.types";

const toDateInput = (value?: string) => {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "";

    return date.toISOString().slice(0, 10);
};

const normalizeEstado = (value?: string | number) => {
    return String(value || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toUpperCase();
};

const getEstadoNombre = (solicitud: SolicitudReposicionResponse) => {
    return solicitud.estado?.nombre || solicitud.estado?.descripcion || (solicitud.estadoId ? `Estado ${solicitud.estadoId}` : "");
};

const isPorAprobar = (solicitud: SolicitudReposicionResponse) => {
    const estado = normalizeEstado(getEstadoNombre(solicitud));
    return estado === "POR APROBAR" || estado === "ESTADO 1";
};

const isPorAtender = (solicitud: SolicitudReposicionResponse) => {
    const estado = normalizeEstado(getEstadoNombre(solicitud));
    return estado === "POR ATENDER" || estado === "ESTADO 2";
};

export default function EditarSolicitudReposicionPage() {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();

    const id = String(params?.id || "");
    const mode = searchParams.get("mode");

    const [loading, setLoading] = useState(true);
    const [solicitud, setSolicitud] = useState<SolicitudReposicionResponse | null>(null);

    const isViewMode = mode === "view";
    const isEditable = Boolean(solicitud && (isPorAprobar(solicitud) || isPorAtender(solicitud)) && !isViewMode);

    useEffect(() => {
        const fetchSolicitud = async () => {
            if (!id) return;

            setLoading(true);

            try {
                const response = await solicitudReposicionService.getById(id);

                if (!response.isSuccess) {
                    toast.error(response.message || "No se pudo cargar la solicitud.");
                    router.push("/dashboard/solicitudes-reposicion");
                    return;
                }

                setSolicitud(response.data);
            } catch {
                toast.error("Error al cargar la solicitud de reposición.");
                router.push("/dashboard/solicitudes-reposicion");
            } finally {
                setLoading(false);
            }
        };

        fetchSolicitud();
    }, [id, router]);

    const initialValue: Partial<SolicitudReposicionFormValue> | undefined = useMemo(() => {
        if (!solicitud) return undefined;

        return {
            almacen_origenId: solicitud.almacen_origenId || "",
            almacen_destinoId: solicitud.almacen_destinoId || "",
            fecha_plazo_solicitud: toDateInput(solicitud.fecha_plazo_solicitud),
            observacion: solicitud.observacion || "",
            cuentausuarioId: solicitud.cuentausuarioId || "CU0001",
            detalle: (solicitud.detalles || []).map((item) => ({
                bienId: item.bienId || "",
                presentacionId: item.presentacionId || "",
                cantidad_solicitada: Number(item.cantidad_solicitada || 0),
                cantidad_atendida: Number(item.cantidad_atendida || 0),
                saldo_pendiente: item.saldo_pendiente,
                observacion: item.observacion || "",
                descripcion_aux: item.bien?.descripcion || "",
                presentaciones_opciones: item.presentacionId
                    ? [
                        {
                            key: item.presentacionId,
                            value: item.presentacionId,
                            label: item.presentacion?.descripcion || item.presentacionId,
                            presentacionId: item.presentacionId
                        }
                    ]
                    : []
            }))
        };
    }, [solicitud]);

    const readonlyInfo: SolicitudReposicionReadonlyInfo | undefined = useMemo(() => {
        if (!solicitud) return undefined;

        return {
            estadoId: solicitud.estadoId,
            estadoNombre: solicitud.estado?.nombre || solicitud.estado?.descripcion || "",
            estadoDescripcion: solicitud.estado?.descripcion || "",
            fecha_aprobacion: solicitud.fecha_aprobacion,
            motivo_rechazo: solicitud.motivo_rechazo || "",
            solicitanteNombre: solicitud.cuentaUsuario?.observacion || solicitud.cuentausuarioId,
            solicitanteUsuario: solicitud.cuentaUsuario?.usuario || solicitud.cuentausuarioId,
            aprobadorNombre: solicitud.usuarioAprobacion?.observacion || solicitud.usuario_aprobacionId || "",
            aprobadorUsuario: solicitud.usuarioAprobacion?.usuario || solicitud.usuario_aprobacionId || ""
        };
    }, [solicitud]);

    const handleSubmit = async (payload: SolicitudReposicionCreatePayload) => {
        if (!id) return;

        const updatePayload: SolicitudReposicionUpdatePayload = {
            almacen_origenId: payload.almacen_origenId,
            fecha_plazo_solicitud: payload.fecha_plazo_solicitud,
            observacion: payload.observacion,
            detalle: payload.detalle
        };

        const response = await solicitudReposicionService.update(id, updatePayload);

        if (!response.isSuccess) {
            toast.error(response.message || "No se pudo actualizar la solicitud.");
            return;
        }

        toast.success("Solicitud actualizada correctamente.");
        router.push("/dashboard/solicitudes-reposicion");
    };

    if (loading) {
        return (
            <div className="p-6">
                <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-400">
                    Cargando solicitud de reposición...
                </div>
            </div>
        );
    }

    if (!solicitud || !initialValue) {
        return (
            <div className="p-6">
                <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-400">
                    No se encontró la solicitud.
                </div>
            </div>
        );
    }

    return (
        <SolicitudReposicionForm
            key={solicitud.id}
            title={isViewMode ? `Ver Solicitud #${solicitud.id}` : `Editar Solicitud #${solicitud.id}`}
            subtitle={
                isEditable
                    ? "Puede modificar la cabecera permitida y el detalle mientras la solicitud esté POR APROBAR o POR ATENDER."
                    : "Esta solicitud no puede editarse porque ya no está en estado editable."
            }
            submitText="Actualizar solicitud"
            initialValue={initialValue}
            readonlyInfo={readonlyInfo}
            readOnly={!isEditable}
            lockDestino={true}
            loading={loading}
            onBack={() => router.push("/dashboard/solicitudes-reposicion")}
            onSubmit={handleSubmit}
        />
    );
}
