"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { IconLoader, IconPlus, IconTrash } from "@tabler/icons-react";
import SearchableSelect from "@/components/forms/SearchableSelect";
import { almacenLoteService } from "@/services/almacenLoteService";
import { presentacionService } from "@/services/presentacionService";
import { productoService } from "@/services/productoService";

export type SelectOption = {
    key?: string | number;
    value: string | number;
    label?: string;
    aux?: string | number;
    raw?: unknown;
};

type BienDetalle = {
    bienId?: string | number;
    cod_admin?: string | number;
    descripcion?: string;
    codigo_existencia?: string;
};

export type LoteDetalleItem = {
    presentacionId?: string;
    almacenId?: string;
    cantidad_lote_stock?: number | string;
    presentacion?: {
        descripcion?: string;
        bien?: BienDetalle;
    };
    almacen?: {
        descripcion?: string;
    };
};

type LoteDetalleEditorProps = {
    detalles: LoteDetalleItem[];
    onChange: (detalles: LoteDetalleItem[]) => void;
    empresaId: string;
    almacenOptions: SelectOption[];
    editable?: boolean;
    showAddInitially?: boolean;
};

export default function LoteDetalleEditor({
    detalles,
    onChange,
    empresaId,
    almacenOptions,
    editable = true,
    showAddInitially = false,
}: LoteDetalleEditorProps) {
    const [showAddForm, setShowAddForm] = useState(showAddInitially);
    const [addForm, setAddForm] = useState({
        bienId: "",
        bienLabel: "",
        bienCodigo: "",
        presentacionId: "",
        presentacionLabel: "",
        almacenId: "",
        almacenLabel: "",
        cantidad: ""
    });
    const [presentacionOptions, setPresentacionOptions] = useState<SelectOption[]>([]);
    const [stockInfo, setStockInfo] = useState({
        loading: false,
        stockReal: 0,
        totalStock: 0,
        permitido: 0,
        consulted: false
    });

    const totalStock = useMemo(() => {
        return detalles.reduce((acc, detalle) => acc + Number(detalle.cantidad_lote_stock || 0), 0);
    }, [detalles]);

    const almacenesParaDetalle = useMemo(() => {
        return almacenOptions.filter((option) => String(option.value) !== "000");
    }, [almacenOptions]);

    const resetAddForm = () => {
        setAddForm({
            bienId: "",
            bienLabel: "",
            bienCodigo: "",
            presentacionId: "",
            presentacionLabel: "",
            almacenId: "",
            almacenLabel: "",
            cantidad: ""
        });
        setPresentacionOptions([]);
        setStockInfo({ loading: false, stockReal: 0, totalStock: 0, permitido: 0, consulted: false });
    };

    const getDetalleBienId = (detalle: LoteDetalleItem) => String(detalle.presentacion?.bien?.bienId || "").trim();

    const existsCombination = (almacenId: string, bienId: string, presentacionId: string) => {
        return detalles.some((detalle) => {
            const sameAlmacen = String(detalle.almacenId || "").trim() === almacenId;
            const samePresentacion = String(detalle.presentacionId || "").trim() === presentacionId;
            const detalleBienId = getDetalleBienId(detalle);
            return sameAlmacen && samePresentacion && (!detalleBienId || detalleBienId === bienId);
        });
    };

    const fetchPresentaciones = async (bienId: string) => {
        if (!bienId) {
            setPresentacionOptions([]);
            return;
        }

        try {
            const response = await presentacionService.getByBien(bienId, true);
            const options = response.isSuccess ? (response.data || []).map((presentacion: {
                presentacionId?: string | number;
                descripcion?: string;
                unidadmedidaId?: string;
                cantidad?: string | number;
            }) => ({
                key: String(presentacion.presentacionId || "").trim(),
                value: String(presentacion.presentacionId || "").trim(),
                label: String(presentacion.descripcion || presentacion.unidadmedidaId || "").trim(),
                aux: presentacion.cantidad
            })) : [];
            setPresentacionOptions(options);
        } catch {
            toast.error("Error al cargar presentaciones del producto.");
        }
    };

    const consultarDisponibilidad = async (nextForm = addForm) => {
        if (!nextForm.almacenId || !nextForm.presentacionId) return;

        setStockInfo((prev) => ({ ...prev, loading: true, consulted: false }));
        try {
            const [stockResponse, lotesResponse] = await Promise.all([
                almacenLoteService.getStockPresentacion(nextForm.almacenId, nextForm.presentacionId),
                almacenLoteService.getByAlmacenYPresentacion(nextForm.almacenId, nextForm.presentacionId, 1, 20)
            ]);

            const stockReal = Number(stockResponse.data?.[0]?.stock_real_pres || 0);
            const meta = lotesResponse.meta as typeof lotesResponse.meta & { TotalStock?: number; totalStock?: number };
            const totalAsignado = Number(meta?.TotalStock ?? meta?.totalStock ?? 0);

            setStockInfo({
                loading: false,
                stockReal,
                totalStock: totalAsignado,
                permitido: stockReal - totalAsignado,
                consulted: true
            });
        } catch {
            setStockInfo({ loading: false, stockReal: 0, totalStock: 0, permitido: 0, consulted: true });
            toast.error("No se pudo consultar el stock disponible para esta presentación.");
        }
    };

    const handleProductoChange = async (value: string | number, option?: SelectOption) => {
        const bienId = String(value || "").trim();
        const nextForm = {
            ...addForm,
            bienId,
            bienLabel: String(option?.label || "").trim(),
            bienCodigo: String(option?.aux || "").trim(),
            presentacionId: "",
            presentacionLabel: "",
            cantidad: ""
        };
        setAddForm(nextForm);
        setStockInfo({ loading: false, stockReal: 0, totalStock: 0, permitido: 0, consulted: false });
        await fetchPresentaciones(bienId);
    };

    const handlePresentacionChange = (value: string | number) => {
        const presentacionId = String(value || "").trim();
        const presentacionLabel = String(presentacionOptions.find((option) => String(option.value) === presentacionId)?.label || "").trim();
        const nextForm = { ...addForm, presentacionId, presentacionLabel, cantidad: "" };
        setAddForm(nextForm);
        setStockInfo({ loading: false, stockReal: 0, totalStock: 0, permitido: 0, consulted: false });
        consultarDisponibilidad(nextForm);
    };

    const handleAlmacenChange = (value: string | number) => {
        const almacenId = String(value || "").trim();
        const almacenLabel = String(almacenOptions.find((option) => String(option.value) === almacenId)?.label || "").trim();
        const nextForm = { ...addForm, almacenId, almacenLabel, cantidad: "" };
        setAddForm(nextForm);
        setStockInfo({ loading: false, stockReal: 0, totalStock: 0, permitido: 0, consulted: false });
        consultarDisponibilidad(nextForm);
    };

    const handleCantidadChange = (index: number, value: string) => {
        onChange(detalles.map((detalle, idx) => (
            idx === index ? { ...detalle, cantidad_lote_stock: value } : detalle
        )));
    };

    const handleRemoveDetalle = (index: number) => {
        onChange(detalles.filter((_, idx) => idx !== index));
    };

    const handleAddDetalle = () => {
        if (!addForm.bienId || !addForm.presentacionId || !addForm.almacenId) {
            toast.warning("Seleccione producto, presentación y almacén.");
            return;
        }

        if (existsCombination(addForm.almacenId, addForm.bienId, addForm.presentacionId)) {
            toast.warning("Esta combinación de almacén, producto y presentación ya existe en el lote.");
            return;
        }

        if (!stockInfo.consulted || stockInfo.loading) {
            toast.warning("Espere a que termine la consulta de stock.");
            return;
        }

        if (stockInfo.permitido <= 0) {
            toast.error("No hay cantidad disponible para agregar esta combinación.");
            return;
        }

        const cantidad = Number(addForm.cantidad || 0);
        if (cantidad <= 0) {
            toast.warning("La cantidad debe ser mayor a cero.");
            return;
        }

        if (cantidad > stockInfo.permitido) {
            toast.error(`La cantidad máxima permitida es ${stockInfo.permitido.toFixed(2)}.`);
            return;
        }

        onChange([
            ...detalles,
            {
                almacenId: addForm.almacenId,
                presentacionId: addForm.presentacionId,
                cantidad_lote_stock: cantidad,
                almacen: {
                    descripcion: addForm.almacenLabel
                },
                presentacion: {
                    descripcion: addForm.presentacionLabel,
                    bien: {
                        bienId: addForm.bienId,
                        descripcion: addForm.bienLabel,
                        codigo_existencia: addForm.bienCodigo
                    }
                }
            }
        ]);
        toast.success("Producto agregado a la lista.");
        setShowAddForm(false);
        resetAddForm();
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <h4 className="text-sm font-black text-slate-800">Bienes asociados</h4>
                    <p className="text-xs text-slate-500">Almacén, producto, presentación y cantidad registrada para este lote.</p>
                </div>
                <button
                    type="button"
                    disabled={!editable}
                    onClick={() => {
                        if (showAddForm) {
                            setShowAddForm(false);
                            resetAddForm();
                        } else {
                            setShowAddForm(true);
                        }
                    }}
                    className={`inline-flex items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold transition-colors ${
                        editable
                            ? "border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                            : "border-slate-200 bg-slate-50 text-slate-400"
                    }`}
                >
                    <IconPlus size={16} /> {showAddForm ? "Ocultar formulario" : "Agregar producto"}
                </button>
            </div>

            {editable && showAddForm && (
                <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
                        <SearchableSelect
                            label="Producto"
                            name="bienId"
                            value={addForm.bienId}
                            fallbackLabel={addForm.bienLabel}
                            fetchCustom={async (term) => {
                                const response = await productoService.getByEmpresa(empresaId, 1, 20, term, { condicion_estado: ["STOCK"] }, true);
                                return response.isSuccess ? (response.data || []).map((producto: {
                                    bienId?: string | number;
                                    descripcion?: string;
                                    codigo_existencia?: string | number;
                                }) => ({
                                    key: String(producto.bienId || "").trim(),
                                    value: String(producto.bienId || "").trim(),
                                    label: String(producto.descripcion || "").trim(),
                                    aux: String(producto.codigo_existencia || "").trim()
                                })) : [];
                            }}
                            onChange={(event) => handleProductoChange(event.target.value, (event as unknown as { option?: SelectOption }).option)}
                            placeholder="Seleccione producto"
                        />

                        <SearchableSelect
                            label="Presentación"
                            name="presentacionId"
                            value={addForm.presentacionId}
                            options={presentacionOptions}
                            fallbackLabel={addForm.presentacionLabel}
                            onChange={(event) => handlePresentacionChange(event.target.value)}
                            disabled={!addForm.bienId || presentacionOptions.length === 0}
                            placeholder="Seleccione presentación"
                        />

                        <SearchableSelect
                            label="Almacén"
                            name="almacenId"
                            value={addForm.almacenId}
                            options={almacenesParaDetalle}
                            fallbackLabel={addForm.almacenLabel}
                            onChange={(event) => handleAlmacenChange(event.target.value)}
                            placeholder="Seleccione almacén"
                        />

                        <div className="flex flex-col gap-1.5">
                            <label className="ml-1 text-[10px] font-bold uppercase text-slate-500">Cantidad</label>
                            <input
                                type="number"
                                min="0.01"
                                max={stockInfo.permitido > 0 ? stockInfo.permitido : undefined}
                                step="0.01"
                                value={addForm.cantidad}
                                onChange={(event) => setAddForm((prev) => ({ ...prev, cantidad: event.target.value }))}
                                className="rounded-lg border border-slate-200 bg-white p-2.5 text-right text-xs font-bold outline-none transition-colors focus:border-blue-500"
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    <div className="mt-3 flex flex-col gap-3 border-t border-blue-100 pt-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
                            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                                <p className="text-[10px] font-bold uppercase text-slate-400">Stock presentación</p>
                                <p className="font-mono font-black text-slate-700">{stockInfo.loading ? "..." : stockInfo.stockReal.toFixed(2)}</p>
                            </div>
                            <div className="rounded-lg border border-slate-200 bg-white px-3 py-2">
                                <p className="text-[10px] font-bold uppercase text-slate-400">Asignado en lotes</p>
                                <p className="font-mono font-black text-slate-700">{stockInfo.loading ? "..." : stockInfo.totalStock.toFixed(2)}</p>
                            </div>
                            <div className={`rounded-lg border px-3 py-2 ${
                                stockInfo.consulted && stockInfo.permitido <= 0 ? "border-rose-200 bg-rose-50" : "border-emerald-200 bg-emerald-50"
                            }`}>
                                <p className={`text-[10px] font-bold uppercase ${
                                    stockInfo.consulted && stockInfo.permitido <= 0 ? "text-rose-600" : "text-emerald-600"
                                }`}>Permitido</p>
                                <p className={`font-mono font-black ${
                                    stockInfo.consulted && stockInfo.permitido <= 0 ? "text-rose-700" : "text-emerald-700"
                                }`}>
                                    {stockInfo.loading ? "..." : stockInfo.permitido.toFixed(2)}
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={handleAddDetalle}
                            disabled={stockInfo.loading}
                            className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-bold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            {stockInfo.loading ? <IconLoader size={16} className="animate-spin" /> : <IconPlus size={16} />}
                            Agregar a Lista
                        </button>
                    </div>

                    {addForm.almacenId && addForm.presentacionId && existsCombination(addForm.almacenId, addForm.bienId, addForm.presentacionId) && (
                        <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
                            Esta combinación de almacén, producto y presentación ya existe en la lista.
                        </p>
                    )}

                    {stockInfo.consulted && stockInfo.permitido <= 0 && (
                        <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                            No hay cantidad disponible para esta presentación en el almacén seleccionado.
                        </p>
                    )}
                </div>
            )}

            <div className="overflow-hidden rounded-lg border border-slate-200">
                <div className="max-h-[360px] overflow-auto">
                    <table className="w-full min-w-[820px] text-left text-xs">
                        <thead className="sticky top-0 bg-slate-100 text-[10px] font-black uppercase text-slate-500 shadow-sm">
                            <tr>
                                <th className="p-3">Almacén</th>
                                <th className="p-3 whitespace-nowrap">Cod Admin</th>
                                <th className="p-3">Bien</th>
                                <th className="p-3">Presentación</th>
                                <th className="p-3 text-right">Cantidad</th>
                                {editable && <th className="p-3 text-center">Acción</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {detalles.length === 0 ? (
                                <tr>
                                    <td colSpan={editable ? 6 : 5} className="p-8 text-center italic text-slate-400">
                                        Este lote no tiene bienes asociados.
                                    </td>
                                </tr>
                            ) : (
                                detalles.map((detalle, index) => {
                                    const bien = detalle.presentacion?.bien;
                                    return (
                                        <tr key={`${detalle.almacenId}-${detalle.presentacionId}-${index}`} className="hover:bg-slate-50">
                                            <td className="p-3">
                                                <p className="font-bold text-slate-700" title={detalle.almacen?.descripcion}>{detalle.almacen?.descripcion || "-"}</p>
                                            </td>
                                            <td className="p-3 font-mono font-bold text-slate-700">{bien?.cod_admin || "-"}</td>
                                            <td className="p-3">
                                                <p className="font-semibold text-slate-700">{bien?.descripcion || "-"}</p>
                                                {bien?.codigo_existencia && <p className="mt-0.5 font-mono text-[10px] text-slate-400">{bien.codigo_existencia}</p>}
                                            </td>
                                            <td className="p-3">
                                                <p className="font-semibold text-slate-700">{detalle.presentacion?.descripcion || "-"}</p>
                                            </td>
                                            <td className="p-3 text-right">
                                                {editable ? (
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        className="w-28 rounded-lg border border-slate-200 bg-white p-2 text-right font-mono text-xs font-bold outline-none focus:border-blue-500"
                                                        value={detalle.cantidad_lote_stock ?? 0}
                                                        onChange={(event) => handleCantidadChange(index, event.target.value)}
                                                    />
                                                ) : (
                                                    <span className="font-mono font-black text-blue-700">
                                                        {Number(detalle.cantidad_lote_stock || 0).toFixed(2)}
                                                    </span>
                                                )}
                                            </td>
                                            {editable && (
                                                <td className="p-3 text-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveDetalle(index)}
                                                        className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                                                        title="Eliminar de la lista"
                                                    >
                                                        <IconTrash size={17} />
                                                    </button>
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

            <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-right text-xs">
                <span className="font-bold uppercase text-blue-600">Total en detalle:</span>
                <span className="ml-2 font-mono font-black text-blue-700">{totalStock.toFixed(2)}</span>
            </div>
        </div>
    );
}
