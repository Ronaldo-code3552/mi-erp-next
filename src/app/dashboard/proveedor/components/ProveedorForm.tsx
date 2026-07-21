"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { InputHTMLAttributes } from "react";
import { toast } from "sonner";
import {
    IconArrowLeft,
    IconBuildingStore,
    IconDeviceFloppy,
    IconId,
    IconLoader,
    IconNotes,
    IconPhone,
    IconWallet
} from "@tabler/icons-react";

import ExternalSearchInput from "@/components/forms/ExternalSearchInput";
import SearchableSelect from "@/components/forms/SearchableSelect";
import { useCatalogs } from "@/hooks/useCatalogs";
import { claseProveedorService } from "@/services/claseProveedorService";
import { cuentasProveedorService } from "@/services/cuentasProveedorService";
import { tipoProveedorService } from "@/services/tipoProveedorService";
import { ubigeoService } from "@/services/ubigeoService";
import { CuentaProveedor } from "@/types/cuentasProveedor.types";
import {
    Proveedor,
    ProveedorPayload
} from "@/types/proveedor.types";
import { Ubigeo } from "@/types/ubigeo.types";
import ProveedorCuentasModal from "./ProveedorCuentasModal";

const EMPRESA_ID = "005";
const TENANT_ID = "1";

type SelectOption = {
    key?: string | number;
    value: string | number;
    label?: string;
    aux?: string | number;
    raw?: unknown;
};

export type ProveedorFormValue = {
    proveedorId?: string;
    tipoproveedorId: string;
    claseproveedorId: string;
    descripcion: string;
    docidentId: string;
    numeroDoc: string;
    direccion: string;
    telefonoFijo: string;
    telefonoFijo2: string;
    telefonoMovil: string;
    telefonoMovil2: string;
    fechaNacimiento: string;
    email: string;
    website: string;
    estado: boolean;
    ubidst: string;
    tenantId: string;
    ubigeoPais: string;
    ubigeoDepartamento: string;
    ubigeoProvincia: string;
    ubigeoDistritoLabel: string;
};

interface ProveedorFormProps {
    title: string;
    subtitle?: string;
    submitText: string;
    initialValue?: Partial<Proveedor>;
    readOnly?: boolean;
    onBack: () => void;
    onSubmit: (payload: ProveedorPayload) => Promise<void>;
}

type FormInputProps = InputHTMLAttributes<HTMLInputElement> & {
    label: string;
};

const toDateInput = (value?: string | null) => {
    if (!value) return "";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    return date.toISOString().slice(0, 10);
};

const normalizeProveedor = (source?: Partial<Proveedor>): ProveedorFormValue => {
    const raw = source || {};
    const estado = raw.estado ?? raw.Estado;
    const ubigeo = raw.ubigeo || raw.Ubigeo;

    return {
        proveedorId: raw.proveedorId || raw.ProveedorId || "",
        tipoproveedorId: String(raw.tipoproveedorId || raw.TipoproveedorId || "").trim(),
        claseproveedorId: String(raw.claseproveedorId ?? raw.ClaseproveedorId ?? "").trim(),
        descripcion: String(raw.descripcion || raw.Descripcion || "").trim(),
        docidentId: String(raw.docidentId || raw.DocidentId || "").trim(),
        numeroDoc: String(raw.numeroDoc || raw.NumeroDoc || raw.numero_doc || "").trim(),
        direccion: String(raw.direccion || raw.Direccion || "").trim(),
        telefonoFijo: String(raw.telefonoFijo || raw.TelefonoFijo || raw.telefono_fijo || "").trim(),
        telefonoFijo2: String(raw.telefonoFijo2 || raw.TelefonoFijo2 || raw.telefono_fijo2 || "").trim(),
        telefonoMovil: String(raw.telefonoMovil || raw.TelefonoMovil || raw.telefono_movil || "").trim(),
        telefonoMovil2: String(raw.telefonoMovil2 || raw.TelefonoMovil2 || raw.telefono_movil2 || "").trim(),
        fechaNacimiento: toDateInput(raw.fechaNacimiento || raw.FechaNacimiento || raw.fecha_nacimiento),
        email: String(raw.email || raw.Email || "").trim(),
        website: String(raw.website || raw.Website || "").trim(),
        estado: estado === undefined || estado === null ? true : Boolean(estado),
        ubidst: String(raw.ubidst || raw.Ubidst || "").trim(),
        tenantId: String(raw.tenantId || raw.TenantId || TENANT_ID).trim(),
        ubigeoPais: String(ubigeo?.ubipan || "").trim(),
        ubigeoDepartamento: String(ubigeo?.ubiden || "").trim(),
        ubigeoProvincia: String(ubigeo?.ubiprn || "").trim(),
        ubigeoDistritoLabel: String(ubigeo?.ubidsn || raw.ubidst || raw.Ubidst || "").trim()
    };
};

const getProveedorCuentas = (source?: Partial<Proveedor>): CuentaProveedor[] => {
    return source?.cuentasProveedor || source?.CuentasProveedor || [];
};

const getCuentaId = (cuenta: CuentaProveedor) => {
    return cuenta.cuentasProveedorId || cuenta.cuentasproveedorId || cuenta.CuentasProveedorId || "";
};

const getCuentaNumero = (cuenta: CuentaProveedor) => {
    return cuenta.numeroCuenta || cuenta.NumeroCuenta || cuenta.n_cuenta || "-";
};

const getCuentaCci = (cuenta: CuentaProveedor) => {
    return cuenta.cci || cuenta.Cci || cuenta.c_cci || "-";
};

const getCuentaBanco = (cuenta: CuentaProveedor) => {
    return cuenta.banco?.nombre ||
        cuenta.bancos?.nombre ||
        cuenta.Banco?.nombre ||
        cuenta.banco?.descripcion ||
        cuenta.bancos?.descripcion ||
        cuenta.Banco?.descripcion ||
        String(cuenta.bancosId || cuenta.BancosId || cuenta.idBancos || "-");
};

const getCuentaMoneda = (cuenta: CuentaProveedor) => {
    return cuenta.moneda?.descripcion ||
        cuenta.Moneda?.descripcion ||
        cuenta.moneda?.simbolomoneda ||
        cuenta.Moneda?.simbolomoneda ||
        cuenta.monedaId ||
        cuenta.MonedaId ||
        "-";
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

const SectionTitle = ({ title, icon: Icon }: { title: string; icon: typeof IconBuildingStore }) => (
    <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <Icon size={18} className="text-blue-600" />
        <h3 className="text-xs font-bold uppercase tracking-wide text-slate-800">{title}</h3>
    </div>
);

export default function ProveedorForm({
    title,
    subtitle,
    submitText,
    initialValue,
    readOnly = false,
    onBack,
    onSubmit
}: ProveedorFormProps) {
    const [formData, setFormData] = useState<ProveedorFormValue>(() => normalizeProveedor(initialValue));
    const [saving, setSaving] = useState(false);
    const [loadingUbigeo, setLoadingUbigeo] = useState(false);
    const [cuentas, setCuentas] = useState<CuentaProveedor[]>(() => getProveedorCuentas(initialValue));
    const [cuentasModalOpen, setCuentasModalOpen] = useState(false);
    const [paisOptions, setPaisOptions] = useState<SelectOption[]>([]);
    const [departamentoOptions, setDepartamentoOptions] = useState<SelectOption[]>([]);
    const [provinciaOptions, setProvinciaOptions] = useState<SelectOption[]>([]);
    const [distritoOptions, setDistritoOptions] = useState<SelectOption[]>([]);

    const isEditing = Boolean(formData.proveedorId);
    const isLockedByEstado = isEditing && !formData.estado;
    const isReadOnly = readOnly || isLockedByEstado;

    useEffect(() => {
        setFormData(normalizeProveedor(initialValue));
        setCuentas(getProveedorCuentas(initialValue));
    }, [initialValue]);

    const refreshCuentas = useCallback(async () => {
        const proveedorId = formData.proveedorId;
        if (!proveedorId) return;

        const response = await cuentasProveedorService.getByProveedor(proveedorId, 1, 20);

        if (response.isSuccess) {
            setCuentas(response.data || []);
        }
    }, [formData.proveedorId]);

    const { catalogs, loadingCatalogs } = useCatalogs(["DocumentoIdentidadXcore"]);

    const documentoOptions = useMemo<SelectOption[]>(() => {
        return (catalogs.DocumentoIdentidadXcore || []).map((item) => ({
            key: item.value,
            value: item.value,
            label: item.label,
            aux: item.aux,
            raw: item.originalData
        }));
    }, [catalogs.DocumentoIdentidadXcore]);

    useEffect(() => {
        const fetchPaises = async () => {
            setLoadingUbigeo(true);

            try {
                const response = await ubigeoService.getCascade({ nivel: "pais" });
                if (!response.isSuccess) {
                    toast.error(response.message || "No se pudieron cargar los países.");
                    return;
                }

                setPaisOptions((response.data || []).map((item: Ubigeo) => ({
                    key: item.key || item.ubipai || item.value || "",
                    value: item.value || item.ubipan || "",
                    label: item.value || item.ubipan || "SIN PAÍS",
                    aux: item.key || item.ubipai || item.nacionalidad,
                    raw: item
                })).filter(item => String(item.value).trim() !== ""));
            } finally {
                setLoadingUbigeo(false);
            }
        };

        fetchPaises();
    }, []);

    useEffect(() => {
        const fetchDepartamentos = async () => {
            if (!formData.ubigeoPais) {
                setDepartamentoOptions([]);
                return;
            }

            setLoadingUbigeo(true);

            try {
                const response = await ubigeoService.getCascade({
                    nivel: "departamento",
                    ubipan: formData.ubigeoPais
                });

                setDepartamentoOptions((response.data || []).map((item: Ubigeo) => ({
                    key: item.key || item.ubidep || item.value || "",
                    value: item.value || item.ubiden || "",
                    label: item.value || item.ubiden || "SIN DEPARTAMENTO",
                    aux: item.key || item.ubidep,
                    raw: item
                })).filter(item => String(item.value).trim() !== ""));
            } finally {
                setLoadingUbigeo(false);
            }
        };

        fetchDepartamentos();
    }, [formData.ubigeoPais]);

    useEffect(() => {
        const fetchProvincias = async () => {
            if (!formData.ubigeoDepartamento) {
                setProvinciaOptions([]);
                return;
            }

            setLoadingUbigeo(true);

            try {
                const response = await ubigeoService.getCascade({
                    nivel: "provincia",
                    ubiden: formData.ubigeoDepartamento
                });

                setProvinciaOptions((response.data || []).map((item: Ubigeo) => ({
                    key: item.key || item.ubiprv || item.value || "",
                    value: item.value || item.ubiprn || "",
                    label: item.value || item.ubiprn || "SIN PROVINCIA",
                    aux: item.key || item.ubiprv,
                    raw: item
                })).filter(item => String(item.value).trim() !== ""));
            } finally {
                setLoadingUbigeo(false);
            }
        };

        fetchProvincias();
    }, [formData.ubigeoDepartamento]);

    useEffect(() => {
        const fetchDistritos = async () => {
            if (!formData.ubigeoProvincia) {
                setDistritoOptions([]);
                return;
            }

            setLoadingUbigeo(true);

            try {
                const response = await ubigeoService.getCascade({
                    nivel: "distrito",
                    ubiprn: formData.ubigeoProvincia
                });

                setDistritoOptions((response.data || []).map((item: Ubigeo) => ({
                    key: item.key || item.ubidst || "",
                    value: item.key || item.ubidst || "",
                    label: item.value || item.ubidsn || item.key || item.ubidst || "SIN DISTRITO",
                    aux: item.key || item.ubidst,
                    raw: item
                })).filter(item => String(item.value).trim() !== ""));
            } finally {
                setLoadingUbigeo(false);
            }
        };

        fetchDistritos();
    }, [formData.ubigeoProvincia]);

    const handleChange = (e: { target: { name?: string; value: string | number } }) => {
        const name = e.target.name;
        if (!name) return;

        const upperFields = ["descripcion", "direccion"];
        const nextValue = upperFields.includes(name)
            ? String(e.target.value || "").toUpperCase()
            : String(e.target.value || "");

        setFormData(prev => ({
            ...prev,
            [name]: nextValue
        }));
    };

    const getSearchType = () => {
        const selected = documentoOptions.find(opt => String(opt.value).trim() === String(formData.docidentId).trim());
        const candidate = `${selected?.value || ""} ${selected?.label || ""} ${selected?.aux || ""}`.toUpperCase();

        if (candidate.includes("DNI")) return "DNI";
        if (candidate.includes("CEX") || candidate.includes("CARNET")) return "CARNET";
        return "RUC";
    };

    const fetchTipoProveedorOptions = async (term: string): Promise<SelectOption[]> => {
        const response = await tipoProveedorService.getAll(1, 20, term, { FiltroEstado: true });

        if (!response.isSuccess) return [];

        return (response.data || []).map((item) => ({
            key: item.tipoproveedorId || "",
            value: item.tipoproveedorId || "",
            label: item.descripcion || item.tipoproveedorId || "SIN TIPO",
            raw: item
        })).filter(item => String(item.value).trim() !== "");
    };

    const fetchClaseProveedorOptions = async (term: string): Promise<SelectOption[]> => {
        const response = await claseProveedorService.getAll(1, 20, term, { FiltroEstado: true });

        if (!response.isSuccess) return [];

        return (response.data || []).map((item) => ({
            key: item.claseproveedorId || "",
            value: item.claseproveedorId || "",
            label: item.descripcion || String(item.claseproveedorId || "SIN CLASE"),
            raw: item
        })).filter(item => String(item.value).trim() !== "");
    };

    const handleExternalData = (data: Record<string, unknown>) => {
        const descripcion =
            data.nombreORazonSocial ||
            data.razonSocial ||
            data.nombreCompleto ||
            data.descripcion;
        const direccion =
            data.direccionCompleta ||
            data.direccion ||
            data.direccionFiscal;

        setFormData(prev => ({
            ...prev,
            descripcion: descripcion ? String(descripcion).trim().toUpperCase() : prev.descripcion,
            direccion: direccion ? String(direccion).trim().toUpperCase() : prev.direccion
        }));
    };

    const buildPayload = (): ProveedorPayload => ({
        proveedorId: formData.proveedorId || undefined,
        tipoproveedorId: formData.tipoproveedorId,
        claseproveedorId: formData.claseproveedorId ? Number(formData.claseproveedorId) : null,
        descripcion: formData.descripcion.trim().toUpperCase(),
        docidentId: formData.docidentId,
        numeroDoc: formData.numeroDoc.trim(),
        direccion: formData.direccion.trim().toUpperCase(),
        telefonoFijo: formData.telefonoFijo.trim(),
        telefonoFijo2: formData.telefonoFijo2.trim(),
        telefonoMovil: formData.telefonoMovil.trim(),
        telefonoMovil2: formData.telefonoMovil2.trim(),
        fechaNacimiento: formData.fechaNacimiento || null,
        email: formData.email.trim(),
        website: formData.website.trim(),
        estado: formData.estado,
        ubidst: formData.ubidst.trim(),
        tenantId: formData.tenantId || TENANT_ID
    });

    const handleUbigeoChange = (
        field: "ubigeoPais" | "ubigeoDepartamento" | "ubigeoProvincia" | "ubidst",
        value: string,
        option?: SelectOption
    ) => {
        setFormData(prev => {
            if (field === "ubigeoPais") {
                return {
                    ...prev,
                    ubigeoPais: value,
                    ubigeoDepartamento: "",
                    ubigeoProvincia: "",
                    ubidst: "",
                    ubigeoDistritoLabel: ""
                };
            }

            if (field === "ubigeoDepartamento") {
                return {
                    ...prev,
                    ubigeoDepartamento: value,
                    ubigeoProvincia: "",
                    ubidst: "",
                    ubigeoDistritoLabel: ""
                };
            }

            if (field === "ubigeoProvincia") {
                return {
                    ...prev,
                    ubigeoProvincia: value,
                    ubidst: "",
                    ubigeoDistritoLabel: ""
                };
            }

            return {
                ...prev,
                ubidst: value,
                ubigeoDistritoLabel: String(option?.label || value)
            };
        });
    };

    const validate = () => {
        if (!formData.claseproveedorId) return "La clase de proveedor es obligatoria.";
        if (!formData.tipoproveedorId) return "El tipo de proveedor es obligatorio.";
        if (!formData.docidentId) return "El tipo de documento es obligatorio.";
        if (!formData.numeroDoc.trim()) return "El número de documento es obligatorio.";
        if (!formData.descripcion.trim()) return "La descripción es obligatoria.";

        return "";
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isReadOnly) return;

        const error = validate();
        if (error) {
            toast.error(error);
            return;
        }

        setSaving(true);

        try {
            await onSubmit(buildPayload());
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="p-6 animate-fade-in-up">
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-800">{title}</h1>
                    {subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
                </div>
                <button
                    type="button"
                    onClick={onBack}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-600 shadow-sm transition-all hover:bg-slate-50 active:scale-95"
                >
                    <IconArrowLeft size={18} /> Volver
                </button>
            </div>

            <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="border-b border-slate-100 px-5 py-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                                <IconBuildingStore size={22} />
                            </div>
                            <div>
                                <h2 className="text-sm font-bold uppercase text-slate-800">
                                    {formData.proveedorId ? `Proveedor ${formData.proveedorId}` : "Datos del proveedor"}
                                </h2>
                                <p className="text-xs text-slate-400">
                                    {isLockedByEstado ? "Este proveedor se encuentra anulado." : "Complete la información principal y secundaria."}
                                </p>
                            </div>
                        </div>
                        {isEditing && (
                            <div className="flex flex-col gap-1 md:items-end">
                                <span className="text-[10px] font-black uppercase text-slate-400">Estado</span>
                                <span className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-[10px] font-black uppercase ${
                                    formData.estado
                                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                        : "border-red-100 bg-red-50 text-red-600"
                                }`}>
                                    {formData.estado ? "Activo" : "Anulado"}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="space-y-6 p-5">
                    <section className="space-y-4">
                        <SectionTitle title="Identificación" icon={IconId} />
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                            <SearchableSelect
                                label="Clase Prov."
                                name="claseproveedorId"
                                value={formData.claseproveedorId}
                                fetchCustom={fetchClaseProveedorOptions}
                                fallbackLabel={initialValue?.clase_proveedor?.descripcion || initialValue?.claseProveedor?.descripcion || formData.claseproveedorId}
                                onChange={handleChange}
                                disabled={isReadOnly}
                            />
                            <SearchableSelect
                                label="Tipo Prov."
                                name="tipoproveedorId"
                                value={formData.tipoproveedorId}
                                fetchCustom={fetchTipoProveedorOptions}
                                fallbackLabel={initialValue?.tipo_proveedor?.descripcion || initialValue?.tipoProveedor?.descripcion || formData.tipoproveedorId}
                                onChange={handleChange}
                                disabled={isReadOnly || isEditing}
                            />
                            <SearchableSelect
                                label="Tipo Doc."
                                name="docidentId"
                                value={formData.docidentId}
                                options={documentoOptions}
                                onChange={handleChange}
                                disabled={isReadOnly || isEditing || loadingCatalogs}
                            />
                            <ExternalSearchInput
                                label="N° Doc."
                                name="numeroDoc"
                                value={formData.numeroDoc}
                                onChange={handleChange}
                                onSuccess={handleExternalData}
                                type={getSearchType()}
                                empresaId={EMPRESA_ID}
                                disabled={isReadOnly || isEditing || loadingCatalogs || !formData.docidentId}
                                required
                            />
                        </div>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <FormInput
                                label="Descripción"
                                name="descripcion"
                                value={formData.descripcion}
                                onChange={handleChange}
                                disabled={isReadOnly || isEditing}
                                required
                            />
                            <FormInput
                                label="Dirección"
                                name="direccion"
                                value={formData.direccion}
                                onChange={handleChange}
                                disabled={isReadOnly}
                            />
                        </div>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                            <SearchableSelect
                                label="País"
                                value={formData.ubigeoPais}
                                options={paisOptions}
                                onChange={(e) => handleUbigeoChange("ubigeoPais", String(e.target.value), e.option)}
                                disabled={isReadOnly || loadingUbigeo}
                                placeholder="-- País --"
                            />
                            <SearchableSelect
                                label="Departamento"
                                value={formData.ubigeoDepartamento}
                                options={departamentoOptions}
                                onChange={(e) => handleUbigeoChange("ubigeoDepartamento", String(e.target.value), e.option)}
                                disabled={isReadOnly || loadingUbigeo || !formData.ubigeoPais}
                                placeholder="-- Departamento --"
                            />
                            <SearchableSelect
                                label="Provincia"
                                value={formData.ubigeoProvincia}
                                options={provinciaOptions}
                                onChange={(e) => handleUbigeoChange("ubigeoProvincia", String(e.target.value), e.option)}
                                disabled={isReadOnly || loadingUbigeo || !formData.ubigeoDepartamento}
                                placeholder="-- Provincia --"
                            />
                            <SearchableSelect
                                label="Distrito"
                                value={formData.ubidst}
                                options={distritoOptions}
                                fallbackLabel={formData.ubigeoDistritoLabel}
                                onChange={(e) => handleUbigeoChange("ubidst", String(e.target.value), e.option)}
                                disabled={isReadOnly || loadingUbigeo || !formData.ubigeoProvincia}
                                placeholder="-- Distrito --"
                            />
                        </div>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                            <FormInput
                                label="Email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                disabled={isReadOnly}
                                type="email"
                            />
                            <FormInput
                                label="Website"
                                name="website"
                                value={formData.website}
                                onChange={handleChange}
                                disabled={isReadOnly}
                            />
                        </div>
                    </section>

                    <section className="space-y-4">
                        <SectionTitle title="Datos secundarios" icon={IconPhone} />
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
                            <FormInput
                                label="Teléfono"
                                name="telefonoFijo"
                                value={formData.telefonoFijo}
                                onChange={handleChange}
                                disabled={isReadOnly}
                            />
                            <FormInput
                                label="Teléfono 2"
                                name="telefonoFijo2"
                                value={formData.telefonoFijo2}
                                onChange={handleChange}
                                disabled={isReadOnly}
                            />
                            <FormInput
                                label="Móvil"
                                name="telefonoMovil"
                                value={formData.telefonoMovil}
                                onChange={handleChange}
                                disabled={isReadOnly}
                            />
                            <FormInput
                                label="Móvil 2"
                                name="telefonoMovil2"
                                value={formData.telefonoMovil2}
                                onChange={handleChange}
                                disabled={isReadOnly}
                            />
                        </div>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                            <FormInput
                                label="F. Nac."
                                name="fechaNacimiento"
                                value={formData.fechaNacimiento}
                                onChange={handleChange}
                                disabled={isReadOnly}
                                type="date"
                            />
                        </div>
                    </section>

                    {isEditing && (
                        <section className="space-y-4">
                            <div className="flex flex-col gap-3 border-b border-slate-200 pb-2 md:flex-row md:items-center md:justify-between">
                                <div className="flex items-center gap-2">
                                    <IconWallet size={18} className="text-blue-600" />
                                    <div>
                                        <h3 className="text-xs font-bold uppercase tracking-wide text-slate-800">Cuentas proveedor</h3>
                                        <p className="text-[11px] font-medium text-slate-400">
                                            {cuentas.length} cuenta(s) bancaria(s) registrada(s)
                                        </p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setCuentasModalOpen(true)}
                                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50 hover:text-blue-600"
                                >
                                    <IconNotes size={15} />
                                    {isReadOnly ? "Ver cuentas" : "Gestionar cuentas"}
                                </button>
                            </div>

                            <div className="overflow-hidden rounded-xl border border-slate-200">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50 font-black uppercase text-slate-500">
                                        <tr>
                                            <th className="w-28 p-3">Código</th>
                                            <th className="p-3">Banco</th>
                                            <th className="p-3">N° Cuenta</th>
                                            <th className="p-3">CCI</th>
                                            <th className="w-32 p-3">Moneda</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {cuentas.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="p-8 text-center text-sm font-semibold text-slate-400">
                                                    No hay cuentas registradas.
                                                </td>
                                            </tr>
                                        ) : (
                                            cuentas.map((cuenta) => (
                                                <tr key={getCuentaId(cuenta)} className="transition-colors hover:bg-slate-50">
                                                    <td className="p-3 font-mono font-bold text-slate-500">{getCuentaId(cuenta)}</td>
                                                    <td className="p-3 font-semibold uppercase text-slate-700">{getCuentaBanco(cuenta)}</td>
                                                    <td className="p-3 font-mono text-slate-700">{getCuentaNumero(cuenta)}</td>
                                                    <td className="p-3 font-mono text-slate-700">{getCuentaCci(cuenta)}</td>
                                                    <td className="p-3 font-semibold uppercase text-slate-700">{getCuentaMoneda(cuenta)}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    )}
                </div>

                <div className="flex justify-end gap-3 border-t border-slate-100 bg-slate-50 px-5 py-4">
                    <button
                        type="button"
                        onClick={onBack}
                        className="rounded-lg px-5 py-2.5 text-xs font-bold text-slate-500 transition-colors hover:bg-slate-200"
                    >
                        Cancelar
                    </button>
                    {!isReadOnly && (
                        <button
                            type="submit"
                            disabled={saving || loadingCatalogs || loadingUbigeo}
                            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-bold text-white shadow-lg shadow-blue-200 transition-all hover:bg-blue-700 active:scale-95 disabled:opacity-60"
                        >
                            {saving ? <IconLoader size={18} className="animate-spin" /> : <IconDeviceFloppy size={18} />}
                            {submitText}
                        </button>
                    )}
                </div>
            </form>

            {isEditing && (
                <ProveedorCuentasModal
                    proveedor={initialValue as Proveedor}
                    isOpen={cuentasModalOpen}
                    readOnly={isReadOnly}
                    onClose={() => setCuentasModalOpen(false)}
                    onSaved={refreshCuentas}
                />
            )}
        </div>
    );
}
