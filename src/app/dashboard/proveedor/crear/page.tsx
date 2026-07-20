"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";

import ProveedorForm from "../components/ProveedorForm";
import { proveedorService } from "@/services/proveedorService";
import { ProveedorPayload } from "@/types/proveedor.types";

export default function CrearProveedorPage() {
    const router = useRouter();

    const handleSubmit = async (payload: ProveedorPayload) => {
        const response = await proveedorService.create(payload);

        if (!response.isSuccess) {
            toast.error(response.message || "No se pudo crear el proveedor.");
            return;
        }

        toast.success("Proveedor registrado correctamente.");
        router.push("/dashboard/proveedor");
    };

    return (
        <ProveedorForm
            title="Registrar Proveedor"
            subtitle="Cree un nuevo proveedor para compras, servicios y cuentas por pagar."
            submitText="Grabar"
            onBack={() => router.push("/dashboard/proveedor")}
            onSubmit={handleSubmit}
        />
    );
}
