"use client";

import { useEffect, useMemo, useState } from "react";
import type { ComponentType, InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { toast } from "sonner";
import {
    IconArrowLeft,
    IconDeviceFloppy,
    IconPackage,
    IconPlus,
    IconTrash,
    IconBuildingStore,
    IconNotes
} from "@tabler/icons-react";

import SearchableSelect from "@/components/forms/SearchableSelect";
import { useCatalogs } from "@/hooks/useCatalogs";
import { presentacionService } from "@/services/presentacionService";
import { productoService } from "@/services/productoService";
import { SolicitudReposicionCreatePayload } from "@/types/solicitudReposicion.types";
import { getAlmacenesActivosOrdenados } from "@/utils/almacenOptions";

const EMPRESA_ID = "005";
const USER_ID = "CU0001";

type PresentacionOption = {
    key: string;
    value: string;
    label?: string;
    presentacionId: string;
};

type CatalogOption = {
    key?: string | number;
    value: string | number;
    label?: string;
    aux?: string | number;
    raw?: unknown;
    cuentausuarioId?: string | number;
    originalData?: {
        cuentausuarioId?: string | number;
        observacion?: string;
        usuario?: string | number;
    };
};

type PresentacionResponse = {
    presentacionId?: string | number;
    descripcion?: string;
    unidadmedidaId?: string;
};

type SelectChangeEvent = {
    target: {
        value: string | number;
    };
    option?: CatalogOption;
};

type DetalleFormItem = {
    bienId: string;
    presentacionId: string;
    cantidad_solicitada: number;
    observacion?: string;
    descripcion_aux?: string;
    presentaciones_opciones?: PresentacionOption[];
};

export type SolicitudReposicionFormValue = {
    almacen_origenId?: string;
    almacen_destinoId: string;
    fecha_plazo_solicitud: string;
    observacion?: string;
    cuentausuarioId: string;
    detalle: DetalleFormItem[];
};

interface SolicitudReposicionFormProps {
    initialValue?: Partial<SolicitudReposicionFormValue>;
    loading?: boolean;
    readOnly?: boolean;
    lockDestino?: boolean;
    submitText?: string;
    title?: string;
    subtitle?: string;
    onBack: () => void;
    onSubmit: (payload: SolicitudReposicionCreatePayload) => Promise<void>;
}

const todayString = () => {
    const d = new Date();
    return d.toISOString().slice(0, 10);
};

type FormInputProps = InputHTMLAttributes<HTMLInputElement> & {
    label: string;
};

const FormInput = ({ label, disabled, className, value, ...props }: FormInputProps) => (
    <div className="flex flex-col gap-1.5 w-full">
        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">
            {label}
        </label>
        <input
            disabled={disabled}
            value={value ?? ""}
            className={`w-full border p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all text-xs
                ${disabled ? "bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed font-bold" : "border-slate-200 bg-white"}
                ${className || ""}`}
            {...props}
        />
    </div>
);

type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
    label: string;
};

const TextArea = ({ label, disabled, value, ...props }: TextAreaProps) => (
    <div className="flex flex-col gap-1.5 w-full">
        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">
            {label}
        </label>
        <textarea
            disabled={disabled}
            value={value ?? ""}
            className={`w-full min-h-[80px] border p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 transition-all text-xs resize-none
                ${disabled ? "bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed" : "border-slate-200 bg-white"}`}
            {...props}
        />
    </div>
);

const SectionTitle = ({ title, icon: Icon }: { title: string; icon: ComponentType<{ className?: string; size?: number }> }) => (
    <div className="flex items-center gap-2 text-slate-800 border-b border-slate-200 pb-2 mb-4 mt-6">
        <Icon className="text-blue-600" size={20} />
        <h3 className="font-bold text-sm uppercase tracking-wide">{title}</h3>
    </div>
);

export default function SolicitudReposicionForm({
    initialValue,
    loading = false,
    readOnly = false,
    lockDestino = false,
    submitText = "Guardar solicitud",
    title = "Solicitud de Reposición",
    subtitle = "Complete la cabecera y el detalle de productos.",
    onBack,
    onSubmit
}: SolicitudReposicionFormProps) {
    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState<SolicitudReposicionFormValue>({
        almacen_origenId: "",
        almacen_destinoId: "",
        fecha_plazo_solicitud: todayString(),
        observacion: "",
        cuentausuarioId: USER_ID,
        detalle: []
    });

    const [items, setItems] = useState<DetalleFormItem[]>([]);

    const { catalogs, loadingCatalogs } = useCatalogs([
        { endpoint: "Almacen", params: { empresaId: EMPRESA_ID } },
        { endpoint: "Producto", params: { empresaId: EMPRESA_ID } },
        { endpoint: "CuentaUsuario", params: { filters: JSON.stringify({ estado: 1 }) } }
    ]);

    const almacenOptions = useMemo(() => {
        return getAlmacenesActivosOrdenados(catalogs["Almacen"] || []);
    }, [catalogs]);

    const usuarioOptions = useMemo(() => {
        return (catalogs["CuentaUsuario"] || []).map((usuario: CatalogOption) => ({
            ...usuario,
            value: String(usuario.originalData?.cuentausuarioId || usuario.value || "").trim(),
            key: String(usuario.originalData?.cuentausuarioId || usuario.value || "").trim(),
            label: String(usuario.originalData?.observacion || usuario.label || "").trim(),
            aux: String(usuario.originalData?.usuario || usuario.aux || "").trim()
        }));
    }, [catalogs]);

    useEffect(() => {
        if (!initialValue) return;

        setFormData({
            almacen_origenId: initialValue.almacen_origenId || "",
            almacen_destinoId: initialValue.almacen_destinoId || "",
            fecha_plazo_solicitud: initialValue.fecha_plazo_solicitud || todayString(),
            observacion: initialValue.observacion || "",
            cuentausuarioId: initialValue.cuentausuarioId || USER_ID,
            detalle: initialValue.detalle || []
        });

        const mappedItems = (initialValue.detalle || []).map((x) => ({
            bienId: x.bienId || "",
            presentacionId: x.presentacionId || "",
            cantidad_solicitada: Number(x.cantidad_solicitada || 0),
            observacion: x.observacion || "",
            descripcion_aux: x.descripcion_aux || "",
            presentaciones_opciones: x.presentaciones_opciones || []
        }));

        setItems(mappedItems);

        mappedItems.forEach((item, index) => {
            if (item.bienId) {
                cargarPresentaciones(item.bienId, index, item.presentacionId);
            }
        });
    }, [initialValue]);

    const handleHeaderChange = (e: { target: { name?: string; value: string | number } }) => {
        const { name, value } = e.target;
        if (!name) return;
        setFormData((prev) => ({
            ...prev,
            [name]: String(value)
        }));
    };

    const handleUsuarioChange = (e: SelectChangeEvent) => {
        const option = e.option;
        const cuentausuarioId = String(
            option?.originalData?.cuentausuarioId ||
            option?.cuentausuarioId ||
            e.target.value ||
            ""
        ).trim();

        setFormData((prev) => ({
            ...prev,
            cuentausuarioId
        }));
    };

    const cargarPresentaciones = async (
        bienId: string,
        index: number,
        selectedPresentacionId?: string
    ) => {
        try {
            const response = await presentacionService.getByBien(bienId, true);

            const opciones: PresentacionOption[] = (response.data || []).map((p: PresentacionResponse) => ({
                key: String(p.presentacionId || "").trim(),
                value: String(p.presentacionId || "").trim(),
                label: p.descripcion || p.unidadmedidaId || p.presentacionId,
                presentacionId: String(p.presentacionId || "").trim()
            }));

            setItems((prev) => {
                const updated = [...prev];

                if (!updated[index]) return prev;

                updated[index] = {
                    ...updated[index],
                    presentaciones_opciones: opciones,
                    presentacionId: selectedPresentacionId || opciones[0]?.presentacionId || ""
                };

                return updated;
            });
        } catch {
            toast.error("Error al cargar presentaciones del producto.");
        }
    };

    const handleAddItem = () => {
        if (readOnly) return;

        setItems((prev) => [
            ...prev,
            {
                bienId: "",
                presentacionId: "",
                cantidad_solicitada: 1,
                observacion: "",
                descripcion_aux: "",
                presentaciones_opciones: []
            }
        ]);
    };

    const handleRemoveItem = (index: number) => {
        if (readOnly) return;
        setItems((prev) => prev.filter((_, i) => i !== index));
    };

    const handleItemChange = async (index: number, field: keyof DetalleFormItem, value: string | number, option?: CatalogOption) => {
        if (readOnly) return;

        setItems((prev) => {
            const updated = [...prev];
            const current = { ...updated[index] };

            if (field === "cantidad_solicitada") {
                const qty = Number(value);

                current.cantidad_solicitada = qty > 0 ? qty : 1;
            } else if (field === "bienId") {
                current.bienId = String(value || "").trim();
                current.presentacionId = "";
                current.descripcion_aux = option?.label || "";
                current.presentaciones_opciones = [];
            } else {
                updated[index] = { ...current, [field]: String(value) };
                return updated;
            }

            updated[index] = current;
            return updated;
        });

        if (field === "bienId" && value) {
            await cargarPresentaciones(String(value).trim(), index);
        }
    };

    const validarFormulario = () => {
        if (!formData.almacen_destinoId || formData.almacen_destinoId.trim() === "") {
            return "El almacén destino es obligatorio.";
        }

        if (!formData.cuentausuarioId || formData.cuentausuarioId.trim() === "") {
            return "El usuario solicitante es obligatorio.";
        }

        if (!formData.fecha_plazo_solicitud) {
            return "La fecha plazo es obligatoria.";
        }

        if (!items.length) {
            return "Debe existir al menos un producto en el detalle.";
        }

        if (items.some((x) => !x.bienId || x.bienId.trim() === "")) {
            return "Cada producto debe tener bienId.";
        }

        if (items.some((x) => !x.presentacionId || x.presentacionId.trim() === "")) {
            return "Cada producto debe tener presentacionId.";
        }

        if (items.some((x) => Number(x.cantidad_solicitada) <= 0)) {
            return "La cantidad solicitada debe ser mayor que cero.";
        }

        const duplicados = items
            .map((x) => `${x.bienId.trim()}|${x.presentacionId.trim()}`)
            .some((key, index, arr) => arr.indexOf(key) !== index);

        if (duplicados) {
            return "No se permiten productos duplicados con la misma presentación.";
        }

        return null;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (readOnly) return;

        const error = validarFormulario();

        if (error) {
            toast.warning(error);
            return;
        }

        const payload: SolicitudReposicionCreatePayload = {
            almacen_origenId: formData.almacen_origenId?.trim() || undefined,
            almacen_destinoId: formData.almacen_destinoId.trim(),
            fecha_plazo_solicitud: formData.fecha_plazo_solicitud,
            observacion: formData.observacion?.trim() || undefined,
            cuentausuarioId: formData.cuentausuarioId.trim(),
            detalle: items.map((item) => ({
                bienId: item.bienId.trim(),
                presentacionId: item.presentacionId.trim(),
                cantidad_solicitada: Number(item.cantidad_solicitada),
                observacion: item.observacion?.trim() || undefined
            }))
        };

        setSaving(true);

        try {
            await onSubmit(payload);
        } finally {
            setSaving(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-5">
            <div className="flex items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800">{title}</h1>
                    <p className="text-sm text-slate-500">{subtitle}</p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={onBack}
                        className="px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-2"
                    >
                        <IconArrowLeft size={18} />
                        Volver
                    </button>

                    {!readOnly && (
                        <button
                            type="submit"
                            disabled={saving || loading || loadingCatalogs}
                            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm"
                        >
                            <IconDeviceFloppy size={18} />
                            {saving ? "Guardando..." : submitText}
                        </button>
                    )}
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <SectionTitle title="Datos de la solicitud" icon={IconBuildingStore} />

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <SearchableSelect
                        label="Almacén origen"
                        name="almacen_origenId"
                        value={formData.almacen_origenId || ""}
                        options={almacenOptions}
                        disabled={readOnly}
                        placeholder="-- Opcional --"
                        onChange={handleHeaderChange}
                    />

                    <SearchableSelect
                        label="Almacén destino"
                        name="almacen_destinoId"
                        value={formData.almacen_destinoId || ""}
                        options={almacenOptions}
                        disabled={readOnly || lockDestino}
                        placeholder="-- Seleccione --"
                        onChange={handleHeaderChange}
                    />

                    <SearchableSelect
                        label="Usuario solicitante"
                        name="cuentausuarioId"
                        value={formData.cuentausuarioId || ""}
                        options={usuarioOptions}
                        disabled={readOnly}
                        placeholder="-- Seleccione --"
                        onChange={handleUsuarioChange}
                    />

                    <FormInput
                        label="Fecha plazo"
                        name="fecha_plazo_solicitud"
                        type="date"
                        value={formData.fecha_plazo_solicitud}
                        disabled={readOnly}
                        onChange={handleHeaderChange}
                    />

                    <div className="md:col-span-2">
                        <TextArea
                            label="Observación"
                            name="observacion"
                            value={formData.observacion}
                            disabled={readOnly}
                            onChange={handleHeaderChange}
                        />
                    </div>
                </div>

                <SectionTitle title="Detalle de productos" icon={IconPackage} />

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="bg-slate-50 border-b border-slate-200 px-4 py-3 flex items-center justify-between">
                        <div>
                            <h3 className="font-bold text-sm text-slate-700">Productos solicitados</h3>
                            <p className="text-xs text-slate-400">Seleccione producto, presentación y cantidad solicitada.</p>
                        </div>

                        {!readOnly && (
                            <button
                                type="button"
                                onClick={handleAddItem}
                                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-2"
                            >
                                <IconPlus size={16} />
                                Agregar
                            </button>
                        )}
                    </div>

                    <div className="overflow-visible min-h-[250px]">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 text-slate-500 uppercase font-semibold">
                                <tr>
                                    <th className="p-3 w-[34%]">Producto</th>
                                    <th className="p-3 w-[22%]">Presentación</th>
                                    <th className="p-3 w-28 text-right">Cantidad</th>
                                    <th className="p-3">Observación</th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100">
                                {items.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="p-8 text-center text-slate-400 italic">
                                            <IconNotes size={42} className="mx-auto mb-2 opacity-20" />
                                            No hay productos agregados
                                        </td>
                                    </tr>
                                ) : (
                                    items.map((item, index) => (
                                        <tr key={index} className="hover:bg-slate-50 transition-colors align-top">
                                            <td className="p-3">
                                                <SearchableSelect
                                                    name="bienId"
                                                    value={item.bienId}
                                                    fetchCustom={async (term) => {
                                                        const response = await productoService.getByEmpresa(EMPRESA_ID, 1, 20, term, {
                                                            condicion_estado: ["STOCK"]
                                                        }, true);

                                                        if (!response.isSuccess) return [];

                                                        return (response.data || []).map((producto) => ({
                                                            key: String(producto.bienId || "").trim(),
                                                            value: String(producto.bienId || "").trim(),
                                                            label: String(producto.descripcion || "").trim(),
                                                            aux: String(producto.codigo_existencia || "").trim(),
                                                            raw: producto
                                                        }));
                                                    }}
                                                    disabled={readOnly}
                                                    fallbackLabel={item.descripcion_aux}
                                                    placeholder="Buscar producto..."
                                                    onChange={(e: SelectChangeEvent) => {
                                                        handleItemChange(index, "bienId", e.target.value, e.option);
                                                    }}
                                                />
                                            </td>

                                            <td className="p-3">
                                                <SearchableSelect
                                                    value={item.presentacionId}
                                                    options={item.presentaciones_opciones || []}
                                                    disabled={readOnly || !item.bienId}
                                                    placeholder="Presentación"
                                                    onChange={(e) => handleItemChange(index, "presentacionId", e.target.value)}
                                                />
                                            </td>

                                            <td className="p-3">
                                                <input
                                                    type="number"
                                                    min="0.0001"
                                                    step="0.0001"
                                                    disabled={readOnly}
                                                    value={item.cantidad_solicitada}
                                                    onChange={(e) => handleItemChange(index, "cantidad_solicitada", e.target.value)}
                                                    className="w-full border border-slate-200 p-1.5 text-right rounded outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 bg-white shadow-sm disabled:bg-slate-100"
                                                />
                                            </td>

                                            <td className="p-3">
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        disabled={readOnly}
                                                        value={item.observacion || ""}
                                                        onChange={(e) => handleItemChange(index, "observacion", e.target.value)}
                                                        placeholder="Observación"
                                                        className="w-full border border-slate-200 p-1.5 rounded outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 bg-white shadow-sm disabled:bg-slate-100"
                                                    />
                                                    {!readOnly && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveItem(index)}
                                                        className="p-1.5 transition-colors rounded text-slate-400 hover:bg-red-50 hover:text-red-500"
                                                        title="Quitar producto"
                                                    >
                                                        <IconTrash size={16} />
                                                    </button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </form>
    );
}
