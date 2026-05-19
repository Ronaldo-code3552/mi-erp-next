"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import {
    IconDeviceFloppy,
    IconEdit,
    IconLoader,
} from "@tabler/icons-react";
import Modal from "@/components/ui/Modal";
import LoteDetalleEditor, { LoteDetalleItem, SelectOption } from "./LoteDetalleEditor";

export type { LoteDetalleItem } from "./LoteDetalleEditor";

type EstadoLote = {
    estado?: string;
    descripcion?: string;
};

export type LoteDetalleCompleto = {
    loteId?: string;
    descripcion?: string;
    fecha_registro?: string;
    fecha_produccion?: string;
    fecha_vencimiento?: string;
    fecha_alerta?: string;
    estado?: string;
    empresaId?: string;
    codigo_lote_importacion?: string;
    Empresa?: {
        razon_social?: string;
    };
    empresa?: {
        razon_social?: string;
    };
    EstadoLote?: EstadoLote;
    detalles?: LoteDetalleItem[];
};

type LoteDetalleModalProps = {
    isOpen: boolean;
    mode: "view" | "edit";
    lote: LoteDetalleCompleto | null;
    loading: boolean;
    saving: boolean;
    empresaId: string;
    almacenOptions: SelectOption[];
    onClose: () => void;
    onSwitchToEdit: () => void;
    onSave: (detalles: LoteDetalleItem[]) => Promise<void>;
};

const formatDate = (value?: string) => {
    if (!value) return "-";
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? "-" : format(parsed, "dd/MM/yyyy");
};

const getEstadoClass = (estado?: string) => {
    const normalized = String(estado || "").trim();
    if (normalized === "Activo") return "bg-emerald-100 text-emerald-700 border-emerald-200";
    if (normalized === "Vencido") return "bg-red-100 text-red-700 border-red-200";
    if (normalized === "Suspendido" || normalized === "Por Vencer" || normalized === "PorVencer") return "bg-amber-100 text-amber-700 border-amber-200";
    if (normalized === "Anulado") return "bg-rose-100 text-rose-700 border-rose-200";
    return "bg-slate-100 text-slate-600 border-slate-200";
};

export default function LoteDetalleModal({
    isOpen,
    mode,
    lote,
    loading,
    saving,
    empresaId,
    almacenOptions,
    onClose,
    onSwitchToEdit,
    onSave,
}: LoteDetalleModalProps) {
    const [detallesDraft, setDetallesDraft] = useState<LoteDetalleItem[]>(() => (
        (lote?.detalles || []).map((detalle) => ({ ...detalle }))
    ));

    const totalStock = useMemo(() => {
        return detallesDraft.reduce((acc, detalle) => acc + Number(detalle.cantidad_lote_stock || 0), 0);
    }, [detallesDraft]);

    const title = mode === "edit" ? "Editar Bienes del Lote" : "Detalle de Lote";
    const empresaLabel = lote?.Empresa?.razon_social || lote?.empresa?.razon_social || lote?.empresaId || "-";

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} size="xl">
            {loading ? (
                <div className="flex flex-col items-center justify-center gap-3 py-16 text-blue-600">
                    <IconLoader size={36} className="animate-spin" />
                    <p className="text-xs font-semibold text-slate-500">Cargando detalle del lote...</p>
                </div>
            ) : lote ? (
                <div className="space-y-5">
                    <div className="flex flex-col gap-4 border-b border-slate-100 pb-4 lg:flex-row lg:items-start lg:justify-between">
                        <div>
                            <p className="text-[10px] font-bold uppercase text-slate-400">Lote ID</p>
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                                <p className="font-mono text-xl font-black text-slate-800">{lote.loteId}</p>
                                <span className={`rounded-full border px-2.5 py-1 text-[10px] font-black uppercase ${getEstadoClass(lote.estado)}`}>
                                    {lote.estado || "Sin estado"}
                                </span>
                            </div>
                            <p className="mt-2 max-w-2xl text-sm font-semibold text-slate-700">
                                {lote.descripcion || "Sin descripción"}
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-right text-xs sm:grid-cols-4 lg:min-w-[420px]">
                            <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                                <p className="text-[10px] font-bold uppercase text-slate-400">Producción</p>
                                <p className="mt-1 font-bold text-slate-700">{formatDate(lote.fecha_produccion)}</p>
                            </div>
                            <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                                <p className="text-[10px] font-bold uppercase text-slate-400">Vence</p>
                                <p className="mt-1 font-bold text-slate-700">{formatDate(lote.fecha_vencimiento)}</p>
                            </div>
                            <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                                <p className="text-[10px] font-bold uppercase text-slate-400">Alerta</p>
                                <p className="mt-1 font-bold text-amber-600">{formatDate(lote.fecha_alerta)}</p>
                            </div>
                            <div className="rounded-lg border border-blue-100 bg-blue-50 p-3">
                                <p className="text-[10px] font-bold uppercase text-blue-600">Stock</p>
                                <p className="mt-1 font-black text-blue-700">{totalStock.toFixed(2)}</p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-3">
                        <div className="rounded-lg border border-slate-100 bg-white p-3">
                            <p className="text-[10px] font-bold uppercase text-slate-400">Cód. importación</p>
                            <p className="mt-1 font-semibold text-slate-700">{lote.codigo_lote_importacion || "-"}</p>
                        </div>
                        <div className="rounded-lg border border-slate-100 bg-white p-3 sm:col-span-2">
                            <p className="text-[10px] font-bold uppercase text-slate-400">Empresa</p>
                            <p className="mt-1 truncate font-semibold text-slate-700" title={empresaLabel}>{empresaLabel}</p>
                        </div>
                    </div>

                    <LoteDetalleEditor
                        detalles={detallesDraft}
                        onChange={setDetallesDraft}
                        empresaId={empresaId}
                        almacenOptions={almacenOptions}
                        editable={mode === "edit"}
                    />

                    <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600 transition-colors hover:bg-slate-200"
                        >
                            Cerrar
                        </button>
                        {mode === "view" ? (
                            <button
                                type="button"
                                onClick={onSwitchToEdit}
                                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-blue-700"
                            >
                                <IconEdit size={18} /> Editar Bienes
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => onSave(detallesDraft)}
                                disabled={saving}
                                className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {saving ? <IconLoader size={18} className="animate-spin" /> : <IconDeviceFloppy size={18} />}
                                Guardar Cambios
                            </button>
                        )}
                    </div>
                </div>
            ) : (
                <div className="py-10 text-center text-sm italic text-slate-400">No se pudo cargar el lote.</div>
            )}
        </Modal>
    );
}
