"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";

import ProveedorForm from "../../components/ProveedorForm";
import { proveedorService } from "@/services/proveedorService";
import { Proveedor, ProveedorPayload } from "@/types/proveedor.types";

export default function EditarProveedorPage() {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const id = String(params?.id || "");
    const isViewMode = searchParams.get("mode") === "view";

    const [loading, setLoading] = useState(true);
    const [proveedor, setProveedor] = useState<Proveedor | null>(null);

    useEffect(() => {
        const fetchProveedor = async () => {
            if (!id) return;

            setLoading(true);

            try {
                const response = await proveedorService.getById(id);

                if (!response.isSuccess) {
                    toast.error(response.message || "No se pudo cargar el proveedor.");
                    router.push("/dashboard/proveedor");
                    return;
                }

                setProveedor(response.data || null);
            } finally {
                setLoading(false);
            }
        };

        fetchProveedor();
    }, [id, router]);

    const handleSubmit = async (payload: ProveedorPayload) => {
        const response = await proveedorService.update({
            ...payload,
            proveedorId: id
        });

        if (!response.isSuccess) {
            toast.error(response.message || "No se pudo actualizar el proveedor.");
            return;
        }

        toast.success("Proveedor actualizado correctamente.");
        router.push("/dashboard/proveedor");
    };

    if (loading) {
        return (
            <div className="p-6">
                <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
                    Cargando proveedor...
                </div>
            </div>
        );
    }

    if (!proveedor) {
        return (
            <div className="p-6">
                <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
                    No se encontró el proveedor.
                </div>
            </div>
        );
    }

    return (
        <ProveedorForm
            key={id}
            title={isViewMode ? `Detalle Proveedor ${id}` : `Editar Proveedor ${id}`}
            subtitle={isViewMode ? "Consulta de información del proveedor." : "Actualice la información permitida del proveedor."}
            submitText="Guardar cambios"
            initialValue={proveedor}
            readOnly={isViewMode}
            onBack={() => router.push("/dashboard/proveedor")}
            onSubmit={handleSubmit}
        />
    );
}
