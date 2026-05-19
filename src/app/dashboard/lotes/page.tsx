"use client";
import { useState, useEffect, useMemo, useCallback } from 'react';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import axios from 'axios';
import { format, addMonths } from 'date-fns';

// Servicios
import { almacenLoteService } from '@/services/almacenLoteService';
import { productoService } from '@/services/productoService';
import { presentacionService } from '@/services/presentacionService';
import { useCatalogs } from '@/hooks/useCatalogs';
import apiClient from '@/api/apiCliente';

// Componentes
import SearchableSelect from '@/components/forms/SearchableSelect';
import Modal from '@/components/ui/Modal';
import LoteDetalleModal, { LoteDetalleCompleto, LoteDetalleItem } from './components/LoteDetalleModal';
import LoteDetalleEditor from './components/LoteDetalleEditor';
import { 
    IconPlus, IconSearch, IconEdit,
    IconDeviceFloppy, IconLoader, IconEye, IconPackage,
    IconChevronLeft, IconChevronRight, IconBan, IconX
} from '@tabler/icons-react';
import { getAlmacenesActivosOrdenados } from '@/utils/almacenOptions';

type SelectOption = {
    key?: string | number;
    value: string | number;
    label?: string;
    aux?: string | number;
    raw?: unknown;
};

type LoteRow = {
    loteId?: string | number;
    value?: string | number;
    descripcion?: string;
    codigo_lote_importacion?: string;
    fecha_produccion?: string;
    fecha_vencimiento?: string;
    fecha_alerta?: string;
    estado?: string;
    stock_disponible?: number | string;
    total?: number | string;
    cantidad?: number | string;
    almacenDesc?: string;
    almacen?: { descripcion?: string };
    empresa?: { razon_social?: string };
    bienDesc?: string;
    presentacionDesc?: string;
};

type EstadoLote = {
    estado: string;
    descripcion: string;
};

type PaginationMeta = {
    totalRecords: number;
    totalPages: number;
    currentPage: number;
};

type ApiPaginationMeta = {
    totalRecords?: number;
    totalPages?: number;
    currentPage?: number;
    totalStock?: number;
    TotalRecords?: number;
    TotalPages?: number;
    CurrentPage?: number;
    TotalStock?: number;
};

const normalizeMeta = (apiMeta: ApiPaginationMeta | undefined, fallbackPage: number, fallbackTotal: number): PaginationMeta => {
    return {
        totalRecords: Number(apiMeta?.totalRecords ?? apiMeta?.TotalRecords ?? fallbackTotal),
        totalPages: Number(apiMeta?.totalPages ?? apiMeta?.TotalPages ?? 1),
        currentPage: Number(apiMeta?.currentPage ?? apiMeta?.CurrentPage ?? fallbackPage)
    };
};

const getApiErrorMessage = (error: unknown, fallback: string) => {
    if (axios.isAxiosError(error)) {
        const data = error.response?.data as { message?: string; title?: string; errors?: unknown } | string | undefined;
        if (typeof data === "string" && data.trim()) return data;
        if (data?.message) return data.message;
        if (data?.title) return data.title;
    }

    return error instanceof Error && error.message ? error.message : fallback;
};

const getDetalleKey = (detalle: LoteDetalleItem) => {
    const almacenId = String(detalle.almacenId || "").trim();
    const presentacionId = String(detalle.presentacionId || "").trim();
    return `${almacenId}::${presentacionId}`;
};

const getDetalleLabel = (detalle: LoteDetalleItem) => {
    const almacen = detalle.almacen?.descripcion || detalle.almacenId || "-";
    const bien = detalle.presentacion?.bien?.descripcion || "Producto";
    const presentacion = detalle.presentacion?.descripcion || detalle.presentacionId || "-";
    return `${almacen} / ${bien} / ${presentacion}`;
};

export default function LotesPage() {
    const EMPRESA_ID = "005";
    const PAGE_SIZE = 20;
    const todayStr = format(new Date(), 'yyyy-MM-dd');

    // --- ESTADOS DE FILTROS ---
    const [filtros, setFiltros] = useState({
        comodin: "",
        productoId: "",
        productoLabel: "",
        presentacionId: "",
        almacenId: "000",
        estado: "TODOS"
    });

    const [presentacionOptions, setPresentacionOptions] = useState<SelectOption[]>([]);
    const [estadoOptions, setEstadoOptions] = useState<EstadoLote[]>([]);
    const [loadingEstados, setLoadingEstados] = useState(false);

    // --- ESTADOS DE GRILLA ---
    const [lotes, setLotes] = useState<LoteRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [meta, setMeta] = useState<PaginationMeta>({ totalRecords: 0, totalPages: 1, currentPage: 1 });
    const [detailLoteModalOpen, setDetailLoteModalOpen] = useState(false);
    const [detailMode, setDetailMode] = useState<"view" | "edit">("view");
    const [detailLoading, setDetailLoading] = useState(false);
    const [detailSaving, setDetailSaving] = useState(false);
    const [selectedLoteData, setSelectedLoteData] = useState<LoteDetalleCompleto | null>(null);

    // --- ESTADOS DE MODAL CABECERA (Crear/Editar) ---
    const [showFormModal, setShowFormModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [loteFormDetalles, setLoteFormDetalles] = useState<LoteDetalleItem[]>([]);
    const [loteForm, setLoteForm] = useState({
        loteId: "",
        codigo_lote_importacion: "",
        descripcion: "",
        fecha_produccion: todayStr,
        fecha_vencimiento: format(addMonths(new Date(), 12), 'yyyy-MM-dd'),
        fecha_alerta: format(addMonths(new Date(), 10), 'yyyy-MM-dd'),
        estado: "Activo"
    });

    // --- CATÁLOGOS BASE ---
    const { catalogs, loadingCatalogs } = useCatalogs([
        { endpoint: 'Almacen', params: { empresaId: EMPRESA_ID } }
    ]);

    const almacenOptions = useMemo(() => {
        return [
            { value: "000", label: "TODOS LOS ALMACENES" },
            ...getAlmacenesActivosOrdenados(catalogs['Almacen'] || [])
        ];
    }, [catalogs]);

    const cargarEstadosLote = useCallback(async () => {
        setLoadingEstados(true);
        try {
            const response = await apiClient.get('/AlmacenEstadoLote');
            const data = Array.isArray(response.data?.data) ? response.data.data as EstadoLote[] : [];
            setEstadoOptions(data);
        } catch {
            toast.error("Error al cargar los estados de lote.");
        } finally {
            setLoadingEstados(false);
        }
    }, []);

    const cargarGrilla = useCallback(async (targetPage = page) => {
        setLoading(true);
        try {
            const filters = {
                estadoJson: filtros.estado !== "TODOS" ? [filtros.estado] : [],
                almacenJson: filtros.almacenId !== "000" ? [filtros.almacenId] : [],
                presentacionJson: filtros.presentacionId ? [filtros.presentacionId] : [],
                bienJson: filtros.productoId ? [filtros.productoId] : []
            };

            const response = await almacenLoteService.getByEmpresa(
                EMPRESA_ID,
                targetPage,
                PAGE_SIZE,
                filtros.comodin,
                filters,
                false,
                false
            );
            
            const dataFiltrada = ((response.data || []) as LoteRow[]).map((lote) => ({
                ...lote,
                loteId: lote.loteId ?? lote.value
            }));

            const nextMeta = normalizeMeta(response.meta, targetPage, dataFiltrada.length);
            setLotes(dataFiltrada);
            setMeta(nextMeta);
            setPage(nextMeta.currentPage);
        } catch {
            toast.error("Error al cargar la lista de lotes.");
        } finally {
            setLoading(false);
        }
    }, [EMPRESA_ID, PAGE_SIZE, filtros, page]);

    // --- EFECTOS ---
    useEffect(() => {
        cargarGrilla();
    }, [cargarGrilla]);

    useEffect(() => {
        cargarEstadosLote();
    }, [cargarEstadosLote]);

    // --- HANDLERS FILTROS ---
    const handleProductoSelect = async (val: string, label = "") => {
        setFiltros({ ...filtros, productoId: val, productoLabel: label, presentacionId: "" });
        if (!val) {
            setPresentacionOptions([]);
            return;
        }
        // Cargar presentaciones en cascada
        try {
            const res = await presentacionService.getByBien(val, true);
            if (res.isSuccess) {
                setPresentacionOptions((res.data || []).map((p: { presentacionId?: string | number; descripcion?: string; unidadmedidaId?: string; cantidad?: string | number }) => ({
                    key: String(p.presentacionId || '').trim(),
                    value: String(p.presentacionId || '').trim(),
                    label: String(p.descripcion || p.unidadmedidaId || '').trim(),
                    aux: p.cantidad
                })));
            }
        } catch {
            toast.error("Error al cargar presentaciones");
        }
    };

    const limpiarProductoFiltro = () => {
        setFiltros({ ...filtros, productoId: "", productoLabel: "", presentacionId: "" });
        setPresentacionOptions([]);
    };

    const limpiarFiltros = () => {
        setFiltros({
            comodin: "",
            productoId: "",
            productoLabel: "",
            presentacionId: "",
            almacenId: "000",
            estado: "TODOS"
        });
        setPresentacionOptions([]);
    };

    // --- HANDLERS MODAL ---
    const abrirModalNuevo = () => {
        setLoteForm({
            loteId: "",
            codigo_lote_importacion: "",
            descripcion: "",
            fecha_produccion: todayStr,
            fecha_vencimiento: format(addMonths(new Date(), 12), 'yyyy-MM-dd'),
            fecha_alerta: format(addMonths(new Date(), 10), 'yyyy-MM-dd'),
            estado: "Activo"
        });
        setLoteFormDetalles([]);
        setShowFormModal(true);
    };

    const abrirModalEditar = (lote: LoteRow) => {
        setLoteForm({
            loteId: String(lote.loteId || lote.value || ''),
            codigo_lote_importacion: lote.codigo_lote_importacion || "",
            descripcion: lote.descripcion || "",
            fecha_produccion: lote.fecha_produccion ? lote.fecha_produccion.substring(0, 10) : todayStr,
            fecha_vencimiento: lote.fecha_vencimiento ? lote.fecha_vencimiento.substring(0, 10) : todayStr,
            fecha_alerta: lote.fecha_alerta ? lote.fecha_alerta.substring(0, 10) : todayStr,
            estado: lote.estado || "Activo"
        });
        setLoteFormDetalles([]);
        setShowFormModal(true);
    };

    const mapDetallesForPayload = (detalles: LoteDetalleItem[] = []) => {
        return detalles.map((detalle) => ({
            presentacionId: String(detalle.presentacionId || '').trim(),
            almacenId: String(detalle.almacenId || '').trim(),
            cantidad_lote_stock: Number(detalle.cantidad_lote_stock || 0)
        })).filter((detalle) => detalle.presentacionId && detalle.almacenId);
    };

    const validarDetallesContraStock = async (detalles: LoteDetalleItem[], detallesOriginales: LoteDetalleItem[] = []) => {
        const originalPorCombinacion = detallesOriginales.reduce<Record<string, number>>((acc, detalle) => {
            const key = getDetalleKey(detalle);
            acc[key] = (acc[key] || 0) + Number(detalle.cantidad_lote_stock || 0);
            return acc;
        }, {});

        const nuevoPorCombinacion = detalles.reduce<Record<string, { detalle: LoteDetalleItem; cantidad: number }>>((acc, detalle) => {
            const key = getDetalleKey(detalle);
            acc[key] = {
                detalle,
                cantidad: (acc[key]?.cantidad || 0) + Number(detalle.cantidad_lote_stock || 0)
            };
            return acc;
        }, {});

        for (const { detalle, cantidad } of Object.values(nuevoPorCombinacion)) {
            const almacenId = String(detalle.almacenId || '').trim();
            const presentacionId = String(detalle.presentacionId || '').trim();

            if (!almacenId || !presentacionId) {
                return "Todos los detalles deben tener almacén y presentación.";
            }

            if (cantidad < 0) {
                return `La cantidad no puede ser negativa en ${getDetalleLabel(detalle)}.`;
            }

            const [stockResponse, lotesResponse] = await Promise.all([
                almacenLoteService.getStockPresentacion(almacenId, presentacionId),
                almacenLoteService.getByAlmacenYPresentacion(almacenId, presentacionId, 1, 20)
            ]);

            const stockReal = Number(stockResponse.data?.[0]?.stock_real_pres || 0);
            const totalStock = Number(lotesResponse.meta?.totalStock ?? lotesResponse.meta?.TotalStock ?? 0);
            const cantidadOriginal = originalPorCombinacion[getDetalleKey(detalle)] || 0;
            const maximoPermitido = stockReal - (totalStock - cantidadOriginal);

            if (cantidad > maximoPermitido) {
                return `No hay stock suficiente para ${getDetalleLabel(detalle)}. Máximo permitido: ${Math.max(0, maximoPermitido).toFixed(2)}. Cantidad ingresada: ${cantidad.toFixed(2)}.`;
            }
        }

        return null;
    };

    const guardarCabeceraLote = async () => {
        if (!loteForm.fecha_produccion || !loteForm.fecha_vencimiento || !loteForm.fecha_alerta) {
            toast.warning("Complete las fechas obligatorias del lote.");
            return;
        }

        const fProd = new Date(loteForm.fecha_produccion);
        const fVenc = new Date(loteForm.fecha_vencimiento);
        const fAlert = new Date(loteForm.fecha_alerta);

        if (fVenc < fProd) {
            toast.error("La fecha de vencimiento no puede ser menor que la fecha de producción.");
            return;
        }

        if (fAlert > fVenc) {
            toast.error("La fecha de alerta no puede ser mayor que la fecha de vencimiento.");
            return;
        }

        if (!loteForm.loteId && loteFormDetalles.some((detalle) => Number(detalle.cantidad_lote_stock || 0) <= 0)) {
            toast.error("Los detalles del lote deben tener cantidades mayores a cero.");
            return;
        }

        setSaving(true);
        try {
            let detallesActuales: LoteDetalleItem[] = loteFormDetalles;
            if (loteForm.loteId) {
                const loteActual = await almacenLoteService.getById(loteForm.loteId);
                detallesActuales = ((loteActual.data as LoteDetalleCompleto | undefined)?.detalles || []);
            }

            const payload = {
                empresaId: EMPRESA_ID,
                descripcion: loteForm.descripcion,
                fecha_produccion: loteForm.fecha_produccion,
                fecha_vencimiento: loteForm.fecha_vencimiento,
                fecha_alerta: loteForm.fecha_alerta,
                codigo_lote_importacion: loteForm.codigo_lote_importacion,
                detalles: mapDetallesForPayload(detallesActuales)
            };

            if (loteForm.loteId) {
                await almacenLoteService.update(loteForm.loteId, loteForm.estado, payload);
                toast.success("Lote actualizado correctamente.");
            } else {
                await almacenLoteService.create(payload);
                toast.success("Lote registrado correctamente.");
            }
            setShowFormModal(false);
            setLoteFormDetalles([]);
            cargarGrilla();
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, "No se pudo guardar el lote."));
        } finally {
            setSaving(false);
        }
    };

    // UI Helpers
    const getBadge = (estado?: string) => {
        const normalized = String(estado || '').trim();
        const estadoMeta = estadoOptions.find((item) => item.estado === normalized);
        const colorClass = normalized === "Activo"
            ? "bg-emerald-100 text-emerald-700"
            : normalized === "Vencido"
                ? "bg-red-100 text-red-700"
                : normalized === "Suspendido" || normalized === "Por Vencer" || normalized === "PorVencer"
                    ? "bg-amber-100 text-amber-700"
                    : normalized === "Anulado"
                        ? "bg-rose-100 text-rose-700"
                        : "bg-slate-100 text-slate-600";

        return (
            <span className={`px-2 py-1 rounded-full text-xs font-bold`} title={estadoMeta?.descripcion || normalized || 'Sin estado'}>
                <span className={colorClass + " px-2 py-1 rounded-full"}>{normalized || 'Sin estado'}</span>
            </span>
        );
    };

    const formatDate = (value?: string) => {
        if (!value) return '-';
        const parsed = new Date(value);
        return Number.isNaN(parsed.getTime()) ? '-' : format(parsed, 'dd/MM/yyyy');
    };

    const normalizeDateInput = (value?: string) => value ? value.substring(0, 10) : todayStr;

    const openDetalleLote = async (lote: LoteRow, mode: "view" | "edit" = "view") => {
        const loteId = String(lote.loteId || lote.value || '').trim();
        if (!loteId) {
            toast.warning("No se pudo identificar el lote seleccionado.");
            return;
        }

        setDetailMode(mode);
        setDetailLoteModalOpen(true);
        setDetailLoading(true);
        setSelectedLoteData(null);

        try {
            const response = await almacenLoteService.getById(loteId);
            if (!response.isSuccess || !response.data) {
                toast.error(response.message || "No se pudo cargar el detalle del lote.");
                return;
            }
            setSelectedLoteData(response.data as LoteDetalleCompleto);
        } catch {
            toast.error("Error al cargar el detalle del lote.");
        } finally {
            setDetailLoading(false);
        }
    };

    const guardarDetallesLote = async (detalles: LoteDetalleItem[]) => {
        if (!selectedLoteData?.loteId) {
            toast.warning("No se pudo identificar el lote a actualizar.");
            return;
        }

        setDetailSaving(true);
        try {
            const validationError = await validarDetallesContraStock(detalles, selectedLoteData.detalles || []);
            if (validationError) {
                toast.error(validationError);
                return;
            }

            const payload = {
                empresaId: selectedLoteData.empresaId || EMPRESA_ID,
                descripcion: selectedLoteData.descripcion || "",
                fecha_produccion: normalizeDateInput(selectedLoteData.fecha_produccion),
                fecha_vencimiento: normalizeDateInput(selectedLoteData.fecha_vencimiento),
                fecha_alerta: normalizeDateInput(selectedLoteData.fecha_alerta),
                codigo_lote_importacion: selectedLoteData.codigo_lote_importacion || "",
                detalles: mapDetallesForPayload(detalles)
            };

            const response = await almacenLoteService.update(
                selectedLoteData.loteId,
                selectedLoteData.estado || "Activo",
                payload
            );

            if (!response.isSuccess) {
                toast.error(response.message || "No se pudieron actualizar los bienes del lote.");
                return;
            }

            toast.success("Bienes del lote actualizados correctamente.");
            setSelectedLoteData((prev) => prev ? { ...prev, detalles } : prev);
            setDetailMode("view");
            cargarGrilla(meta.currentPage);
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, "No se pudieron guardar los cambios del lote."));
        } finally {
            setDetailSaving(false);
        }
    };

    const handleAnularLote = async (lote: LoteRow) => {
        const loteId = String(lote.loteId || lote.value || '').trim();
        if (!loteId) {
            toast.warning("No se pudo identificar el lote seleccionado.");
            return;
        }

        const result = await Swal.fire({
            title: "¿Anular lote?",
            html: `<span style="color: grey; font-size: 14px;">${loteId}</span>`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Sí, anular",
            confirmButtonColor: "#f59e0b",
            cancelButtonText: "Cancelar",
        });

        if (!result.isConfirmed) return;

        try {
            const response = await almacenLoteService.anular(loteId);
            if (!response.isSuccess) {
                toast.error(response.message || "No se pudo anular el lote.");
                return;
            }

            toast.success(response.message || "Lote anulado correctamente.");
            cargarGrilla(meta.currentPage);
        } catch (error: unknown) {
            toast.error(getApiErrorMessage(error, "Error al anular el lote."));
        }
    };

    return (
        <div className="p-6 w-full max-w-[96rem] mx-auto pb-20 animate-fade-in-up">
            {/* --- HEADER --- */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Gestión de Lotes</h1>
                    <p className="text-xs text-slate-500">Módulo Inventario Almacén</p>
                </div>
            </div>

            {/* --- PANEL DE FILTROS --- */}
            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 mb-6 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <button 
                        onClick={abrirModalNuevo} 
                        className="bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2.5 rounded-lg font-bold flex items-center gap-2 transition-colors shadow-sm"
                        title="Nuevo lote"
                    >
                        <IconPlus size={18} /> Nuevo Lote
                    </button>

                    <div className="flex gap-2 w-full md:w-auto">
                        <div className="relative w-full md:w-64">
                            <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input 
                                type="text" 
                                placeholder="Búsqueda General" 
                                className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg text-sm outline-none focus:border-blue-500"
                                value={filtros.comodin}
                                onChange={e => setFiltros({ ...filtros, comodin: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-6 gap-4 pt-4 border-t border-slate-100">
                    <SearchableSelect 
                        label="Almacén"
                        name="almacenId"
                        options={almacenOptions}
                        value={filtros.almacenId}
                        onChange={(e) => setFiltros({ ...filtros, almacenId: String(e.target.value) })}
                        disabled={loadingCatalogs}
                    />

                    <div className="flex gap-2 items-end">
                        <div className="flex-1 min-w-0">
                            <SearchableSelect 
                                label="Búsqueda por Producto"
                                name="productoId"
                                value={filtros.productoId}
                                fallbackLabel={filtros.productoLabel}
                                onChange={(e) => {
                                    const option = (e as unknown as { option?: SelectOption }).option;
                                    handleProductoSelect(String(e.target.value), String(option?.label || ""));
                                }}
                                fetchCustom={async (term) => {
                                    const res = await productoService.getByEmpresa(EMPRESA_ID, 1, 20, term, { condicion_estado: ['STOCK'] }, true);
                                    return res.isSuccess ? (res.data || []).map((p: { bienId?: string | number; descripcion?: string; codigo_existencia?: string | number }) => ({
                                        key: String(p.bienId || '').trim(),
                                        value: String(p.bienId || '').trim(),
                                        label: String(p.descripcion || '').trim(),
                                        aux: String(p.codigo_existencia || '').trim()
                                    })) : [];
                                }}
                            />
                        </div>
                        <button
                            type="button"
                            onClick={limpiarProductoFiltro}
                            disabled={!filtros.productoId}
                            className="h-[38px] w-[38px] rounded-lg border border-slate-200 bg-white text-slate-400 transition-colors hover:bg-slate-50 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-40 flex items-center justify-center"
                            title="Limpiar producto"
                        >
                            <IconX size={16} />
                        </button>
                    </div>
                    
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Presentación</label>
                        <select 
                            className="border border-slate-200 p-2.5 rounded-lg text-xs outline-none bg-white"
                            value={filtros.presentacionId}
                            onChange={e => setFiltros({ ...filtros, presentacionId: e.target.value })}
                            disabled={!filtros.productoId}
                        >
                            <option value="">-- Todas --</option>
                            {presentacionOptions.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                        </select>
                    </div>

                    <div className="flex gap-2 items-end">
                        <div className="flex-1 flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Estado</label>
                            <select 
                            className="border border-slate-200 p-2.5 rounded-lg text-xs outline-none bg-white"
                            value={filtros.estado}
                            onChange={e => setFiltros({ ...filtros, estado: e.target.value })}
                            disabled={loadingEstados}
                        >
                            <option value="TODOS">Todos</option>
                            {estadoOptions.map((estado) => (
                                <option key={estado.estado} value={estado.estado}>{estado.estado}</option>
                            ))}
                        </select>
                        </div>
                    </div>

                    <button 
                        onClick={() => cargarGrilla(1)}
                        className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-2.5 rounded-lg transition-colors flex items-center justify-center h-[38px] self-end"
                        title="Filtrar"
                    >
                        <IconSearch size={18} />
                    </button>

                    <button
                        type="button"
                        onClick={limpiarFiltros}
                        className="h-[38px] self-end rounded-lg border border-slate-200 bg-white px-4 text-xs font-bold text-slate-600 transition-colors hover:bg-slate-50 hover:text-blue-600"
                    >
                        Limpiar
                    </button>
                </div>
            </div>

            {/* --- GRILLA --- */}
            <div className="bg-white border border-slate-300 rounded-lg shadow-sm flex flex-col overflow-hidden">
                <div className="overflow-auto custom-scrollbar h-[calc(100vh-360px)] min-h-[420px] relative">
                    <table className="w-full min-w-[900px] border-collapse text-left text-sm">
                        <thead className="bg-slate-100 sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="py-3 px-4 font-bold text-xs text-slate-600 uppercase border-b border-slate-300 whitespace-nowrap">Lote ID</th>
                                <th className="py-3 px-4 font-bold text-xs text-slate-600 uppercase border-b border-slate-300">Descripción</th>
                                <th className="py-3 px-4 font-bold text-xs text-slate-600 uppercase border-b border-slate-300 whitespace-nowrap">Lote Import.</th>
                                <th className="py-3 px-4 font-bold text-xs text-slate-600 uppercase border-b border-slate-300 whitespace-nowrap">F. Producción</th>
                                <th className="py-3 px-4 font-bold text-xs text-slate-600 uppercase border-b border-slate-300 whitespace-nowrap">F. Vencimiento</th>
                                <th className="py-3 px-4 font-bold text-xs text-slate-600 uppercase border-b border-slate-300 text-center">Estado</th>
                                <th className="py-3 px-4 font-bold text-xs text-slate-600 uppercase border-b border-slate-300 text-right">Stock</th>
                                <th className="py-3 px-4 font-bold text-xs text-slate-600 uppercase border-b border-slate-300 text-center">Opciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {loading ? (
                                <tr><td colSpan={8} className="py-20 text-center text-slate-400"><IconLoader className="animate-spin inline mr-2"/> Cargando datos del ERP...</td></tr>
                            ) : lotes.length === 0 ? (
                                <tr><td colSpan={8} className="py-20 text-center text-slate-400 italic">No existen registros</td></tr>
                            ) : (
                                lotes.map((lote) => {
                                    const loteId = String(lote.loteId || lote.value || '').trim();
                                    const stock = lote.stock_disponible ?? lote.total ?? lote.cantidad ?? 0;

                                    return (
                                    <tr key={loteId} className="hover:bg-blue-50/30 transition-colors">
                                        <td className="px-4 py-3 font-mono font-bold text-slate-700">{loteId}</td>
                                        <td className="px-4 py-3">
                                            <div className="font-semibold text-slate-700">{lote.descripcion || 'Sin descripción'}</div>
                                            {(lote.bienDesc || lote.presentacionDesc) && (
                                                <div className="mt-1 flex flex-wrap gap-1 text-[10px] text-slate-500">
                                                    {lote.bienDesc && <span className="rounded bg-slate-100 px-1.5 py-0.5">{lote.bienDesc}</span>}
                                                    {lote.presentacionDesc && <span className="rounded bg-blue-50 px-1.5 py-0.5 text-blue-700">{lote.presentacionDesc}</span>}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">{lote.codigo_lote_importacion || '-'}</td>
                                        <td className="px-4 py-3 whitespace-nowrap">{formatDate(lote.fecha_produccion)}</td>
                                        <td className="px-4 py-3 whitespace-nowrap">{formatDate(lote.fecha_vencimiento)}</td>
                                        <td className="px-4 py-3 text-center">{getBadge(lote.estado)}</td>
                                        <td className="px-4 py-3 text-right font-mono font-bold text-blue-700">{Number(stock || 0).toFixed(2)}</td>
                                        <td className="px-4 py-3 text-center">
                                            <div className="flex justify-center gap-1">
                                                <button 
                                                    onClick={() => openDetalleLote(lote, "view")} 
                                                    className="p-1.5 hover:bg-amber-50 text-slate-400 hover:text-amber-600 rounded transition-colors" 
                                                    title="Ver Detalle"
                                                >
                                                    <IconEye size={18} />
                                                </button>
                                                <button 
                                                    onClick={() => abrirModalEditar(lote)} 
                                                    className="p-1.5 hover:bg-blue-50 text-slate-400 hover:text-blue-600 rounded transition-colors" 
                                                    title="Editar Lote"
                                                >
                                                    <IconEdit size={18} />
                                                </button>
                                                <button 
                                                    onClick={() => openDetalleLote(lote, "edit")} 
                                                    className="p-1.5 hover:bg-purple-50 text-slate-400 hover:text-purple-600 rounded transition-colors" 
                                                    title="Editar Bien"
                                                >
                                                    <IconPackage size={18} />
                                                </button>
                                                <button 
                                                    onClick={() => handleAnularLote(lote)} 
                                                    disabled={String(lote.estado || '').trim() === "Anulado"}
                                                    className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded transition-colors disabled:cursor-not-allowed disabled:opacity-30" 
                                                    title="Anular"
                                                >
                                                    <IconBan size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="bg-slate-50 border-t border-slate-300 p-3 flex justify-between items-center text-xs text-slate-600 font-medium">
                    <div>Mostrando <span className="text-slate-900">{lotes.length}</span> de <span className="text-slate-900">{meta.totalRecords}</span> registros</div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => cargarGrilla(Math.max(1, meta.currentPage - 1))}
                            disabled={loading || meta.currentPage <= 1}
                            className="p-1.5 border rounded-md bg-white hover:bg-slate-100 disabled:opacity-40 shadow-sm"
                            title="Página anterior"
                        >
                            <IconChevronLeft size={16} />
                        </button>
                        <span>Página {meta.currentPage} de {meta.totalPages}</span>
                        <button
                            onClick={() => cargarGrilla(Math.min(meta.totalPages, meta.currentPage + 1))}
                            disabled={loading || meta.currentPage >= meta.totalPages}
                            className="p-1.5 border rounded-md bg-white hover:bg-slate-100 disabled:opacity-40 shadow-sm"
                            title="Página siguiente"
                        >
                            <IconChevronRight size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* --- MODAL CABECERA LOTE --- */}
            <Modal isOpen={showFormModal} onClose={() => setShowFormModal(false)} title={loteForm.loteId ? `Editar Lote: ${loteForm.loteId}` : "Registrar Nuevo Lote"} size={loteForm.loteId ? "md" : "xl"}>
                <div className="p-5 space-y-4">
                    <div className="rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs text-blue-800">
                        <div className="flex items-start gap-2">
                            <IconPackage size={16} className="mt-0.5 shrink-0" />
                            <div>
                                <p className="font-bold">Cabecera de lote</p>
                                <p className="mt-0.5">
                                    {loteForm.loteId
                                        ? "Actualice los datos principales del lote. Los bienes asociados se gestionan desde la opción Editar Bien."
                                        : "Puede registrar solo la cabecera o iniciar el lote con productos asociados en el detalle."}
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Nro Lote Importación</label>
                        <input type="text" className="border border-slate-200 p-2.5 rounded-lg text-sm outline-none focus:border-blue-500" value={loteForm.codigo_lote_importacion} onChange={e => setLoteForm({...loteForm, codigo_lote_importacion: e.target.value})} />
                    </div>
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-bold text-slate-500 uppercase">Descripción</label>
                        <input type="text" placeholder="Ingrese la descripción del lote" className="border border-slate-200 p-2.5 rounded-lg text-sm outline-none focus:border-blue-500" value={loteForm.descripcion} onChange={e => setLoteForm({...loteForm, descripcion: e.target.value})} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Fecha Producción</label>
                            <input type="date" className="border border-slate-200 p-2.5 rounded-lg text-sm outline-none focus:border-blue-500" value={loteForm.fecha_produccion} onChange={e => setLoteForm({...loteForm, fecha_produccion: e.target.value})} />
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Fecha Vencimiento</label>
                            <input type="date" className="border border-slate-200 p-2.5 rounded-lg text-sm outline-none focus:border-blue-500" value={loteForm.fecha_vencimiento} onChange={e => setLoteForm({...loteForm, fecha_vencimiento: e.target.value})} />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 gap-4">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Fecha Alerta</label>
                            <input type="date" className="border border-slate-200 p-2.5 rounded-lg text-sm outline-none focus:border-blue-500" value={loteForm.fecha_alerta} onChange={e => setLoteForm({...loteForm, fecha_alerta: e.target.value})} />
                        </div>
                    </div>

                    {loteForm.loteId && (
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-bold text-slate-500 uppercase">Estado</label>
                            <select
                                className="border border-slate-200 p-2.5 rounded-lg text-sm outline-none focus:border-blue-500 bg-white"
                                value={loteForm.estado}
                                onChange={e => setLoteForm({...loteForm, estado: e.target.value})}
                            >
                                {estadoOptions.map((estado) => (
                                    <option key={estado.estado} value={estado.estado}>{estado.estado}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {!loteForm.loteId && (
                        <div className="border-t border-slate-100 pt-4">
                            <LoteDetalleEditor
                                detalles={loteFormDetalles}
                                onChange={setLoteFormDetalles}
                                empresaId={EMPRESA_ID}
                                almacenOptions={almacenOptions}
                                editable
                            />
                        </div>
                    )}

                    <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 mt-6">
                        <button onClick={() => setShowFormModal(false)} className="px-4 py-2 bg-slate-100 text-slate-600 font-bold rounded-lg hover:bg-slate-200">Cancelar</button>
                        <button onClick={guardarCabeceraLote} disabled={saving} className="px-4 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 flex items-center gap-2">
                            {saving ? <IconLoader size={18} className="animate-spin" /> : <IconDeviceFloppy size={18} />} Guardar
                        </button>
                    </div>
                </div>
            </Modal>

            <LoteDetalleModal
                key={`${selectedLoteData?.loteId || 'lote-detalle'}-${detailMode}`}
                isOpen={detailLoteModalOpen}
                mode={detailMode}
                lote={selectedLoteData}
                loading={detailLoading}
                saving={detailSaving}
                empresaId={EMPRESA_ID}
                almacenOptions={almacenOptions}
                onClose={() => setDetailLoteModalOpen(false)}
                onSwitchToEdit={() => setDetailMode("edit")}
                onSave={guardarDetallesLote}
            />
        </div>
    );
}
