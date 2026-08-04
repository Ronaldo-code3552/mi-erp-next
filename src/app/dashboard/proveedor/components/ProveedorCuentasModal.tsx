"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { toast } from "sonner";
import {
    IconBuildingBank,
    IconDeviceFloppy,
    IconEdit,
    IconLoader2,
    IconTrash,
    IconX
} from "@tabler/icons-react";

import { bancoService } from "@/services/bancoService";
import { cuentasProveedorService } from "@/services/cuentasProveedorService";
import { monedaService } from "@/services/monedaService";
import { Banco } from "@/types/banco.types";
import { CuentaProveedor } from "@/types/cuentasProveedor.types";
import { Moneda } from "@/types/moneda.types";
import { Proveedor } from "@/types/proveedor.types";
import { MONEDA_ID_DEFAULT } from "@/config/appConfig";

type CuentaForm = {
    bancosId: string;
    numeroCuenta: string;
    cci: string;
    monedaId: string;
    observacion: string;
    totalPagado: string;
};

interface ProveedorCuentasModalProps {
    proveedor: Proveedor | null;
    isOpen: boolean;
    readOnly?: boolean;
    onClose: () => void;
    onSaved?: () => void;
}

const initialForm: CuentaForm = {
    bancosId: "",
    numeroCuenta: "",
    cci: "",
    monedaId: MONEDA_ID_DEFAULT,
    observacion: "",
    totalPagado: "0.00"
};

const getProveedorId = (proveedor?: Proveedor | null) => proveedor?.proveedorId || proveedor?.ProveedorId || "";
const getProveedorNombre = (proveedor?: Proveedor | null) => proveedor?.descripcion || proveedor?.Descripcion || "Proveedor";

const getCuentaId = (cuenta: CuentaProveedor) => {
    return cuenta.cuentasProveedorId || cuenta.cuentasproveedorId || cuenta.CuentasProveedorId || "";
};

const getCuentaNumero = (cuenta: CuentaProveedor) => {
    return cuenta.numeroCuenta || cuenta.NumeroCuenta || cuenta.n_cuenta || "-";
};

const getCuentaCci = (cuenta: CuentaProveedor) => {
    return cuenta.cci || cuenta.Cci || cuenta.c_cci || "-";
};

const getBancoNombre = (cuenta: CuentaProveedor) => {
    return cuenta.banco?.nombre ||
        cuenta.bancos?.nombre ||
        cuenta.Banco?.nombre ||
        cuenta.banco?.descripcion ||
        cuenta.bancos?.descripcion ||
        cuenta.Banco?.descripcion ||
        String(cuenta.bancosId || cuenta.BancosId || cuenta.idBancos || "-");
};

const getMonedaNombre = (cuenta: CuentaProveedor) => {
    return cuenta.moneda?.descripcion ||
        cuenta.Moneda?.descripcion ||
        cuenta.moneda?.simbolomoneda ||
        cuenta.Moneda?.simbolomoneda ||
        cuenta.monedaId ||
        cuenta.MonedaId ||
        "-";
};

const getBancoId = (banco: Banco) => banco.idBancos ?? banco.IdBancos ?? 0;
const getBancoNombreOption = (banco: Banco) => banco.nombre || banco.Nombre || String(getBancoId(banco));
const getMonedaId = (moneda: Moneda) => moneda.monedaId || moneda.MonedaId || "";
const getMonedaLabel = (moneda: Moneda) => moneda.descripcion || moneda.Descripcion || getMonedaId(moneda);

const round2 = (value: number) => {
    if (!Number.isFinite(value)) return 0;
    return Math.round((value + Number.EPSILON) * 100) / 100;
};

export default function ProveedorCuentasModal({
    proveedor,
    isOpen,
    readOnly = false,
    onClose,
    onSaved
}: ProveedorCuentasModalProps) {
    const proveedorId = useMemo(() => getProveedorId(proveedor), [proveedor]);
    const [form, setForm] = useState<CuentaForm>(initialForm);
    const [cuentas, setCuentas] = useState<CuentaProveedor[]>([]);
    const [bancos, setBancos] = useState<Banco[]>([]);
    const [monedas, setMonedas] = useState<Moneda[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState("");
    const [editingId, setEditingId] = useState("");

    const fetchCuentas = useCallback(async () => {
        if (!proveedorId) return;

        setLoading(true);

        try {
            const response = await cuentasProveedorService.getByProveedor(proveedorId, 1, 20);

            if (!response.isSuccess) {
                toast.error(response.message || "No se pudieron cargar las cuentas del proveedor.");
                return;
            }

            setCuentas(response.data || []);
        } finally {
            setLoading(false);
        }
    }, [proveedorId]);

    useEffect(() => {
        if (!isOpen) return;

        setForm(initialForm);
        setEditingId("");
        setCuentas([]);

        const fetchDropdowns = async () => {
            const [bancosResponse, monedasResponse] = await Promise.all([
                bancoService.getAll(1, 20),
                monedaService.getAll(1, 20)
            ]);

            if (bancosResponse.isSuccess) {
                setBancos((bancosResponse.data || []).filter((banco) => {
                    const estado = banco.estado ?? banco.Estado;
                    return String(estado ?? "1").trim() !== "0" && estado !== false;
                }));
            }

            if (monedasResponse.isSuccess) {
                setMonedas(monedasResponse.data || []);
            }
        };

        fetchDropdowns();
        fetchCuentas();
    }, [fetchCuentas, isOpen]);

    if (!isOpen || !proveedor) return null;

    const validate = () => {
        if (!form.bancosId) return "Seleccione un banco.";
        if (!form.monedaId) return "Seleccione una moneda.";
        if (!form.numeroCuenta.trim() && !form.cci.trim()) return "Ingrese al menos N° de cuenta o CCI.";

        const totalPagado = Number(form.totalPagado || 0);
        if (!Number.isFinite(totalPagado) || totalPagado < 0) return "El total pagado no puede ser negativo.";
        if (round2(totalPagado) !== totalPagado) return "El total pagado admite como máximo 2 decimales.";

        return "";
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (readOnly) return;

        const error = validate();
        if (error) {
            toast.error(error);
            return;
        }

        setSaving(true);

        try {
            const payload = {
                BancosId: Number(form.bancosId),
                NumeroCuenta: form.numeroCuenta,
                Cci: form.cci,
                MonedaId: form.monedaId,
                Observacion: form.observacion,
                TotalPagado: round2(Number(form.totalPagado || 0))
            };

            const response = editingId
                ? await cuentasProveedorService.update(proveedorId, editingId, payload)
                : await cuentasProveedorService.create(proveedorId, payload);

            if (!response.isSuccess) {
                toast.error(response.message || `No se pudo ${editingId ? "actualizar" : "registrar"} la cuenta.`);
                return;
            }

            toast.success(editingId ? "Cuenta actualizada correctamente." : "Cuenta registrada correctamente.");
            setForm(initialForm);
            setEditingId("");
            onSaved?.();
            fetchCuentas();
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = (cuenta: CuentaProveedor) => {
        const cuentaId = getCuentaId(cuenta);
        const bancosId = cuenta.bancosId ?? cuenta.BancosId ?? cuenta.idBancos ?? cuenta.banco?.idBancos ?? cuenta.bancos?.idBancos ?? cuenta.Banco?.idBancos;
        const totalPagado = cuenta.totalPagado ?? cuenta.TotalPagado ?? cuenta.total_pagado ?? 0;

        setEditingId(cuentaId);
        setForm({
            bancosId: bancosId ? String(bancosId) : "",
            numeroCuenta: getCuentaNumero(cuenta) === "-" ? "" : getCuentaNumero(cuenta),
            cci: getCuentaCci(cuenta) === "-" ? "" : getCuentaCci(cuenta),
            monedaId: cuenta.monedaId || cuenta.MonedaId || cuenta.moneda?.monedaId || cuenta.Moneda?.monedaId || MONEDA_ID_DEFAULT,
            observacion: cuenta.observacion || cuenta.Observacion || "",
            totalPagado: round2(Number(totalPagado || 0)).toFixed(2)
        });
    };

    const cancelEdit = () => {
        setEditingId("");
        setForm(initialForm);
    };

    const handleDelete = async (cuenta: CuentaProveedor) => {
        if (readOnly) return;

        const cuentaId = getCuentaId(cuenta);
        if (!cuentaId) return;

        const result = await Swal.fire({
            title: "¿Eliminar cuenta?",
            text: "La cuenta del proveedor será eliminada.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Eliminar",
            cancelButtonText: "Cancelar",
            confirmButtonColor: "#dc2626"
        });

        if (!result.isConfirmed) return;

        setDeletingId(cuentaId);

        try {
            const response = await cuentasProveedorService.delete(proveedorId, cuentaId);

            if (!response.isSuccess) {
                toast.error(response.message || "No se pudo eliminar la cuenta.");
                return;
            }

            toast.success("Cuenta eliminada correctamente.");
            onSaved?.();
            fetchCuentas();
        } finally {
            setDeletingId("");
        }
    };

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
            <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
                <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
                    <div className="flex min-w-0 items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                            <IconBuildingBank size={22} />
                        </div>
                        <div className="min-w-0">
                            <h2 className="truncate text-base font-black uppercase tracking-wide text-slate-800">Cuentas del proveedor</h2>
                            <p className="truncate text-xs font-semibold text-slate-500">{getProveedorNombre(proveedor)}</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
                        title="Cerrar"
                    >
                        <IconX size={20} />
                    </button>
                </div>

                <div className="overflow-y-auto bg-slate-50/60 p-5">
                    <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
                            <div>
                                <h3 className="text-xs font-black uppercase tracking-wide text-slate-700">
                                    {readOnly ? "Consulta de cuentas bancarias" : editingId ? "Editar cuenta bancaria" : "Nueva cuenta bancaria"}
                                </h3>
                                <p className="text-[11px] font-medium text-slate-400">
                                    {readOnly ? "Información bancaria registrada para este proveedor." : "Registra número de cuenta o CCI para este proveedor."}
                                </p>
                            </div>
                            {!readOnly && (
                                <div className="flex items-center gap-2">
                                    {editingId && (
                                        <button
                                            type="button"
                                            onClick={cancelEdit}
                                            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-500 transition-colors hover:bg-slate-50"
                                        >
                                            Cancelar edición
                                        </button>
                                    )}
                                    <button
                                        type="submit"
                                        disabled={saving}
                                        className="inline-flex h-9 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-xs font-bold text-white shadow-sm transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                                    >
                                        {saving ? <IconLoader2 size={16} className="animate-spin" /> : <IconDeviceFloppy size={16} />}
                                        {editingId ? "Actualizar" : "Guardar"}
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
                            <div className="flex flex-col gap-1.5 xl:col-span-2">
                                <label className="ml-1 text-[10px] font-black uppercase text-slate-500">Banco</label>
                                <select
                                    value={form.bancosId}
                                    onChange={(event) => setForm(prev => ({ ...prev, bancosId: event.target.value }))}
                                    disabled={readOnly}
                                    className="h-[38px] rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                >
                                    <option value="">-- Seleccione banco --</option>
                                    {bancos.map((banco) => (
                                        <option key={getBancoId(banco)} value={getBancoId(banco)}>
                                            {getBancoNombreOption(banco)}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="ml-1 text-[10px] font-black uppercase text-slate-500">N° Cuenta</label>
                                <input
                                    value={form.numeroCuenta}
                                    onChange={(event) => setForm(prev => ({ ...prev, numeroCuenta: event.target.value }))}
                                    disabled={readOnly}
                                    className="h-[38px] rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                    placeholder="Cuenta"
                                    maxLength={45}
                                />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="ml-1 text-[10px] font-black uppercase text-slate-500">CCI</label>
                                <input
                                    value={form.cci}
                                    onChange={(event) => setForm(prev => ({ ...prev, cci: event.target.value }))}
                                    disabled={readOnly}
                                    className="h-[38px] rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                    placeholder="Código CCI"
                                    maxLength={45}
                                />
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="ml-1 text-[10px] font-black uppercase text-slate-500">Moneda</label>
                                <select
                                    value={form.monedaId}
                                    onChange={(event) => setForm(prev => ({ ...prev, monedaId: event.target.value }))}
                                    disabled={readOnly}
                                    className="h-[38px] rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                >
                                    <option value="">-- Seleccione --</option>
                                    {monedas.map((moneda) => (
                                        <option key={getMonedaId(moneda)} value={getMonedaId(moneda)}>
                                            {getMonedaLabel(moneda)}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex flex-col gap-1.5">
                                <label className="ml-1 text-[10px] font-black uppercase text-slate-500">Total Pagado</label>
                                <input
                                    value={form.totalPagado}
                                    disabled
                                    className="h-[38px] rounded-lg border border-slate-200 bg-slate-100 px-3 text-right font-mono text-xs font-bold text-slate-500 outline-none"
                                />
                            </div>

                            <div className="flex flex-col gap-1.5 md:col-span-2 xl:col-span-6">
                                <label className="ml-1 text-[10px] font-black uppercase text-slate-500">Observación</label>
                                <input
                                    value={form.observacion}
                                    onChange={(event) => setForm(prev => ({ ...prev, observacion: event.target.value }))}
                                    disabled={readOnly}
                                    className="h-[38px] rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 outline-none transition-all focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                    placeholder="Observación opcional"
                                    maxLength={250}
                                />
                            </div>
                        </div>
                    </form>

                    <div className="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                            <h3 className="text-xs font-black uppercase tracking-wide text-slate-700">Cuentas registradas</h3>
                            <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-500">{cuentas.length} registro(s)</span>
                        </div>
                        <table className="w-full text-left text-xs">
                            <thead className="bg-slate-50 font-black uppercase text-slate-500">
                                <tr>
                                    <th className="w-24 p-3">Cod</th>
                                    <th className="p-3">Bancos</th>
                                    <th className="p-3">N° Cta</th>
                                    <th className="p-3">CCI</th>
                                    <th className="w-32 p-3">Moneda</th>
                                    {!readOnly && <th className="w-20 p-3 text-center"></th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {loading ? (
                                    <tr>
                                        <td colSpan={readOnly ? 5 : 6} className="p-8 text-center text-slate-400">
                                            <IconLoader2 size={22} className="mx-auto mb-2 animate-spin" />
                                            Cargando cuentas...
                                        </td>
                                    </tr>
                                ) : cuentas.length === 0 ? (
                                    <tr>
                                        <td colSpan={readOnly ? 5 : 6} className="p-8 text-center">
                                            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                                                <IconBuildingBank size={20} />
                                            </div>
                                            <p className="mt-2 text-sm font-semibold text-slate-400">No hay cuentas registradas</p>
                                        </td>
                                    </tr>
                                ) : (
                                    cuentas.map((cuenta) => {
                                        const cuentaId = getCuentaId(cuenta);

                                        return (
                                            <tr key={cuentaId} className="align-top transition-colors hover:bg-slate-50">
                                                <td className="p-3 font-mono font-bold text-slate-500">{cuentaId || "-"}</td>
                                                <td className="p-3 font-semibold uppercase text-slate-700">{getBancoNombre(cuenta)}</td>
                                                <td className="p-3 font-mono text-slate-700">{getCuentaNumero(cuenta)}</td>
                                                <td className="p-3 font-mono text-slate-700">{getCuentaCci(cuenta)}</td>
                                                <td className="p-3 font-semibold uppercase text-slate-700">{getMonedaNombre(cuenta)}</td>
                                                {!readOnly && (
                                                    <td className="p-3 text-center">
                                                        <div className="flex items-center justify-center gap-1">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleEdit(cuenta)}
                                                                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
                                                                title="Editar cuenta"
                                                            >
                                                                <IconEdit size={16} />
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDelete(cuenta)}
                                                                disabled={deletingId === cuentaId}
                                                                className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50"
                                                                title="Eliminar cuenta"
                                                            >
                                                                {deletingId === cuentaId ? <IconLoader2 size={16} className="animate-spin" /> : <IconTrash size={16} />}
                                                            </button>
                                                        </div>
                                                    </td>
                                                )}
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="flex justify-end border-t border-slate-200 bg-white px-5 py-4">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-bold uppercase text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-800"
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}
