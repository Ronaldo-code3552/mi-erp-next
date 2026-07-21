"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import { toast } from "sonner";
import {
    IconBan,
    IconBuildingStore,
    IconCirclePlus,
    IconEdit,
    IconEye,
    IconFilter,
    IconRefresh,
    IconSearch,
    IconTrash,
    IconWallet
} from "@tabler/icons-react";

import FiltrosAvanzados from "@/components/filter/FiltrosAvanzados";
import MultiSelect from "@/components/forms/MultiSelect";
import DataTable from "@/components/shared/DataTable";
import { useCrud } from "@/hooks/useCrud";
import { useCatalogs } from "@/hooks/useCatalogs";
import { useDebounce } from "@/hooks/useDebounce";
import { claseProveedorService } from "@/services/claseProveedorService";
import { proveedorService } from "@/services/proveedorService";
import { tipoProveedorService } from "@/services/tipoProveedorService";
import {
    Proveedor,
    ProveedorFilters
} from "@/types/proveedor.types";
import ProveedorCuentasModal from "./components/ProveedorCuentasModal";

type Option = {
    value: string | number;
    label: string;
};

const initialFilters: ProveedorFilters = {
    estado: [],
    docidentId: [],
    tipoproveedorId: [],
    claseproveedorId: []
};

const estadoOptions = [
    { value: 1, label: "ACTIVO" },
    { value: 0, label: "ANULADO" }
];

const getTipoDescripcion = (row: Proveedor) => {
    return row.tipo_proveedor?.descripcion || row.tipoProveedor?.descripcion || row.tipoproveedorId || row.TipoproveedorId || "-";
};

const getClaseDescripcion = (row: Proveedor) => {
    return row.clase_proveedor?.descripcion || row.claseProveedor?.descripcion || row.claseproveedorId || row.ClaseproveedorId || "-";
};

const getDocumentoCorto = (row: Proveedor) => {
    return row.documento_identidad?.descripcion_corta ||
        row.documentoIdentidad?.descripcion_corta ||
        row.documento_identidad?.abreviatura ||
        row.documentoIdentidad?.abreviatura ||
        row.docidentId ||
        row.DocidentId ||
        "DOC";
};

const getNumeroDoc = (row: Proveedor) => {
    return row.numeroDoc || row.NumeroDoc || row.numero_doc || "-";
};

const getProveedorId = (row: Proveedor) => {
    return row.proveedorId || row.ProveedorId || "";
};

const getProveedorDescripcion = (row: Proveedor) => {
    return row.descripcion || row.Descripcion || "-";
};

const getProveedorDireccion = (row: Proveedor) => {
    return row.direccion || row.Direccion || "";
};

const getProveedorEstado = (row: Proveedor) => {
    return row.estado ?? row.Estado ?? true;
};

export default function ProveedorPage() {
    const router = useRouter();

    const {
        data,
        loading,
        meta,
        searchTerm,
        setSearchTerm,
        filters,
        setFilters,
        fetchData
    } = useCrud<Proveedor>(proveedorService, null, initialFilters);

    const debouncedSearch = useDebounce(searchTerm, 500);
    const [showFilters, setShowFilters] = useState(false);
    const [draftFilters, setDraftFilters] = useState<ProveedorFilters>(initialFilters);
    const [loadingDropdowns, setLoadingDropdowns] = useState(false);
    const [tipoOptions, setTipoOptions] = useState<Option[]>([]);
    const [claseOptions, setClaseOptions] = useState<Option[]>([]);
    const [cuentasProveedor, setCuentasProveedor] = useState<Proveedor | null>(null);
    const { catalogs, loadingCatalogs } = useCatalogs(["DocumentoIdentidadXcore"]);

    useEffect(() => {
        fetchData(1, debouncedSearch, filters);
    }, [debouncedSearch, filters, fetchData]);

    useEffect(() => {
        const fetchDropdowns = async () => {
            setLoadingDropdowns(true);

            try {
                const [tiposResponse, clasesResponse] = await Promise.all([
                    tipoProveedorService.getAll(1, 200, "", { FiltroEstado: true }),
                    claseProveedorService.getAll(1, 200, "", { FiltroEstado: true })
                ]);

                if (tiposResponse.isSuccess) {
                    setTipoOptions((tiposResponse.data || []).map((item) => ({
                        value: item.tipoproveedorId || "",
                        label: item.descripcion || item.tipoproveedorId || "SIN TIPO"
                    })).filter(item => String(item.value).trim() !== ""));
                }

                if (clasesResponse.isSuccess) {
                    setClaseOptions((clasesResponse.data || []).map((item) => ({
                        value: item.claseproveedorId || "",
                        label: item.descripcion || String(item.claseproveedorId || "SIN CLASE")
                    })).filter(item => String(item.value).trim() !== ""));
                }
            } finally {
                setLoadingDropdowns(false);
            }
        };

        fetchDropdowns();
    }, []);

    const docOptions = useMemo(() => {
        return (catalogs.DocumentoIdentidadXcore || []).map((item) => ({
            value: item.value,
            label: item.aux ? `${item.aux} - ${item.label}` : item.label
        }));
    }, [catalogs.DocumentoIdentidadXcore]);

    const totalActiveFilters = useMemo(() => {
        return Object.values(filters || {}).flat().length;
    }, [filters]);

    const handleOpenFilters = () => {
        setDraftFilters(filters as ProveedorFilters);
        setShowFilters(true);
    };

    const handleApplyFilters = () => {
        setFilters(draftFilters);
        setShowFilters(false);
    };

    const handleClearFilters = () => {
        setDraftFilters(initialFilters);
        setFilters(initialFilters);
    };

    const handleDelete = async (row: Proveedor) => {
        const proveedorId = getProveedorId(row);
        if (!proveedorId) return;

        const result = await Swal.fire({
            title: "¿Eliminar proveedor?",
            text: "Esta acción no se puede deshacer.",
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Eliminar",
            cancelButtonText: "Cancelar",
            confirmButtonColor: "#dc2626"
        });

        if (!result.isConfirmed) return;

        const response = await proveedorService.delete(proveedorId);

        if (!response.isSuccess) {
            toast.error(response.message || "No se pudo eliminar el proveedor.");
            return;
        }

        toast.success("Proveedor eliminado correctamente.");
        fetchData(meta.currentPage, searchTerm, filters);
    };

    const handleAnular = async (row: Proveedor) => {
        const proveedorId = getProveedorId(row);
        if (!proveedorId || getProveedorEstado(row) === false) return;

        const result = await Swal.fire({
            title: "¿Anular proveedor?",
            text: "El proveedor quedará inactivo.",
            icon: "question",
            showCancelButton: true,
            confirmButtonText: "Anular",
            cancelButtonText: "Cancelar",
            confirmButtonColor: "#f59e0b"
        });

        if (!result.isConfirmed) return;

        const response = await proveedorService.anular(proveedorId);

        if (!response.isSuccess) {
            toast.error(response.message || "No se pudo anular el proveedor.");
            return;
        }

        toast.success("Proveedor anulado correctamente.");
        fetchData(meta.currentPage, searchTerm, filters);
    };

    const columns = [
        {
            header: "Tipo",
            width: "150px",
            render: (row: Proveedor) => (
                <div className="flex flex-col gap-1">
                    <span className="text-xs font-bold uppercase text-slate-700" title={String(getClaseDescripcion(row))}>
                        {getClaseDescripcion(row)}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400">
                        {row.claseproveedorId || row.ClaseproveedorId || "-"}
                    </span>
                </div>
            )
        },
        {
            header: "Tip Prov",
            width: "150px",
            render: (row: Proveedor) => (
                <div className="flex flex-col gap-1">
                    <span className="text-xs font-bold uppercase text-slate-700" title={String(getTipoDescripcion(row))}>
                        {getTipoDescripcion(row)}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400">
                        {row.tipoproveedorId || row.TipoproveedorId || "-"}
                    </span>
                </div>
            )
        },
        {
            header: "Descripción",
            className: "min-w-[260px]",
            render: (row: Proveedor) => (
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                        <IconBuildingStore size={19} />
                    </div>
                    <div className="min-w-0">
                        <p className="truncate text-sm font-bold uppercase text-slate-800" title={getProveedorDescripcion(row)}>
                            {getProveedorDescripcion(row)}
                        </p>
                        <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase ${
                            getProveedorEstado(row) === false
                                ? "border-red-100 bg-red-50 text-red-600"
                                : "border-emerald-200 bg-emerald-50 text-emerald-700"
                        }`}>
                            {getProveedorEstado(row) === false ? "Anulado" : "Activo"}
                        </span>
                    </div>
                </div>
            )
        },
        {
            header: "ID_Doc",
            width: "90px",
            render: (row: Proveedor) => (
                <span className="rounded-md border border-indigo-100 bg-indigo-50 px-2 py-1 text-[10px] font-bold uppercase text-indigo-700">
                    {getDocumentoCorto(row)}
                </span>
            )
        },
        {
            header: "N° Doc",
            width: "130px",
            render: (row: Proveedor) => (
                <span className="font-mono text-xs font-bold text-blue-700">
                    {getNumeroDoc(row)}
                </span>
            )
        },
        {
            header: "Dirección",
            className: "min-w-[260px]",
            render: (row: Proveedor) => (
                <span className="line-clamp-2 text-[11px] font-semibold uppercase leading-tight text-slate-600" title={getProveedorDireccion(row)}>
                    {getProveedorDireccion(row) || "Sin dirección"}
                </span>
            )
        },
        {
            header: "Acciones",
            width: "160px",
            className: "text-center",
            render: (row: Proveedor) => (
                <div className="flex items-center justify-center gap-1">
                    <button
                        type="button"
                        onClick={() => setCuentasProveedor(row)}
                        className="rounded p-1.5 text-slate-400 transition-colors hover:bg-cyan-50 hover:text-cyan-600"
                        title="Cuentas"
                    >
                        <IconWallet size={17} />
                    </button>
                    <button
                        type="button"
                        onClick={() => getProveedorId(row) && router.push(`/dashboard/proveedor/editar/${getProveedorId(row)}?mode=view`)}
                        className="rounded p-1.5 text-slate-400 transition-colors hover:bg-slate-50 hover:text-blue-600"
                        title="Ver detalle"
                    >
                        <IconEye size={17} />
                    </button>
                    <button
                        type="button"
                        onClick={() => getProveedorId(row) && router.push(`/dashboard/proveedor/editar/${getProveedorId(row)}`)}
                        className="rounded p-1.5 text-slate-400 transition-colors hover:bg-blue-50 hover:text-blue-600"
                        title="Editar"
                    >
                        <IconEdit size={17} />
                    </button>
                    <button
                        type="button"
                        onClick={() => handleAnular(row)}
                        disabled={getProveedorEstado(row) === false}
                        className="rounded p-1.5 text-slate-400 transition-colors hover:bg-amber-50 hover:text-amber-600 disabled:cursor-not-allowed disabled:opacity-30"
                        title="Anular"
                    >
                        <IconBan size={17} />
                    </button>
                    <button
                        type="button"
                        onClick={() => handleDelete(row)}
                        className="rounded p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                        title="Borrar"
                    >
                        <IconTrash size={17} />
                    </button>
                </div>
            )
        }
    ];

    return (
        <div className="p-6 animate-fade-in-up">
            <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-800">Catálogo de Proveedores</h1>
                    <p className="text-sm text-slate-500">Gestión de proveedores y datos fiscales.</p>
                </div>
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => fetchData(meta.currentPage, searchTerm, filters)}
                        className="rounded-lg border border-slate-300 bg-white p-2.5 shadow-sm transition-all hover:text-blue-600"
                        title="Actualizar"
                    >
                        <IconRefresh size={20} className={loading ? "animate-spin" : ""} />
                    </button>
                    <button
                        type="button"
                        onClick={() => router.push("/dashboard/proveedor/crear")}
                        className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 font-bold text-white shadow-lg shadow-blue-200 transition-all hover:bg-blue-700 active:scale-95"
                    >
                        <IconCirclePlus size={20} /> Nuevo Proveedor
                    </button>
                </div>
            </div>

            <div className="mb-4 flex gap-3">
                <div className="relative flex-1">
                    <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por descripción, documento o dirección..."
                        className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm outline-none transition-all focus:border-blue-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <button
                    type="button"
                    onClick={handleOpenFilters}
                    className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 font-semibold transition-all ${
                        totalActiveFilters > 0
                            ? "border-blue-200 bg-blue-50 text-blue-700"
                            : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                    }`}
                >
                    <IconFilter size={20} />
                    Filtros {totalActiveFilters > 0 && `(${totalActiveFilters})`}
                </button>
            </div>

            <DataTable
                columns={columns}
                data={data}
                loading={loading}
                meta={meta}
                onPageChange={(page) => fetchData(page, searchTerm, filters)}
                emptyMessage="No se encontraron proveedores"
            />

            <FiltrosAvanzados
                isOpen={showFilters}
                onClose={() => setShowFilters(false)}
                onApply={handleApplyFilters}
                onClear={handleClearFilters}
                totalActive={Object.values(draftFilters || {}).flat().length}
            >
                {loadingDropdowns || loadingCatalogs ? (
                    <div className="py-10 text-center text-sm italic text-slate-400">Cargando catálogos...</div>
                ) : (
                    <div className="flex flex-col gap-5">
                        <MultiSelect
                            label="Estado"
                            options={estadoOptions}
                            value={draftFilters.estado || []}
                            onChange={(value) => setDraftFilters(prev => ({ ...prev, estado: value }))}
                        />
                        <MultiSelect
                            label="Documento"
                            options={docOptions}
                            value={draftFilters.docidentId || []}
                            onChange={(value) => setDraftFilters(prev => ({ ...prev, docidentId: value }))}
                        />
                        <MultiSelect
                            label="Tipo Proveedor"
                            options={tipoOptions}
                            value={draftFilters.tipoproveedorId || []}
                            onChange={(value) => setDraftFilters(prev => ({ ...prev, tipoproveedorId: value }))}
                        />
                        <MultiSelect
                            label="Clase Proveedor"
                            options={claseOptions}
                            value={draftFilters.claseproveedorId || []}
                            onChange={(value) => setDraftFilters(prev => ({ ...prev, claseproveedorId: value }))}
                        />
                    </div>
                )}
            </FiltrosAvanzados>

            <ProveedorCuentasModal
                proveedor={cuentasProveedor}
                isOpen={Boolean(cuentasProveedor)}
                onClose={() => setCuentasProveedor(null)}
            />
        </div>
    );
}
