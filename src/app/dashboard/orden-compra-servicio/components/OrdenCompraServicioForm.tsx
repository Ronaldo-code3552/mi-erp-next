"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
    IconArrowLeft,
    IconCalendar,
    IconClipboardList,
    IconDeviceFloppy,
    IconFileInvoice,
    IconLoader,
    IconPackage,
    IconPlus,
    IconTrash
} from "@tabler/icons-react";

import SearchableSelect from "@/components/forms/SearchableSelect";
import DocumentoAdjuntosPanel from "@/components/documentos/DocumentoAdjuntosPanel";
import { monedaService } from "@/services/monedaService";
import { presentacionService } from "@/services/presentacionService";
import { productoService } from "@/services/productoService";
import { proveedorService } from "@/services/proveedorService";
import { tipoOrdenService } from "@/services/tipoOrdenService";
import { tipoPagoService } from "@/services/tipoPagoService";
import { trabajadorService } from "@/services/trabajadorService";
import {
    OrdenCompraServicio,
    OrdenCompraServicioDetalle,
    OrdenCompraServicioPayload
} from "@/types/ordenCompraServicio.types";
import { Moneda } from "@/types/moneda.types";
import { Producto } from "@/types/producto.types";
import { Proveedor } from "@/types/proveedor.types";
import { TipoOrden } from "@/types/tipoOrden.types";
import { TipoPago } from "@/types/tipoPago.types";
import { Trabajador } from "@/types/trabajador.types";
import {
    DOCUMENTO_PDF_REFERENCIAS,
    DocumentoPdfFormSubmitResult
} from "@/types/documentoPdf.types";

const EMPRESA_ID = "005";
const USER_ID = "CU0001";
const IGV_RATE = 0.18;

type SelectOption = {
    key?: string | number;
    value: string | number;
    label?: string;
    aux?: string | number;
    raw?: unknown;
};

type OrdenDetalleDraft = {
    bienId: string;
    bienLabel: string;
    bienCodigo: string;
    operacionItemId: string;
    operacionItemLabel: string;
    afectoInafecto: boolean;
    presentacionId: string;
    presentacionLabel: string;
    presentacionCantidad: number;
    cantidad: string;
    costo: string;
    conversionTotal: string;
    conversionTotalDesdeBackend: boolean;
    importe: string;
    importeDesdeBackend: boolean;
    observacion: string;
};

type OrdenFormValue = {
    ordenCompraServicioId: string;
    numeroOrdenCompra: string;
    tipoOrden: string;
    pedidoCompraId: string;
    numeroCotizacion: string;
    fotoCotizacion: string;
    fechaEmision: string;
    fechaEntrega: string;
    monedaId: string;
    tipoCambio: string;
    subtotalAfecto: string;
    subtotalExonerado: string;
    descuentoGlobal: string;
    tipoPagoId: string;
    proveedorId: string;
    observacion: string;
    lugarEntrega: string;
    trabajadorId: string;
    estado: string;
    incluyeIgv: boolean;
    detalles: OrdenDetalleDraft[];
};

interface OrdenCompraServicioFormProps {
    title: string;
    subtitle?: string;
    submitText: string;
    initialValue?: Partial<OrdenCompraServicio>;
    readOnly?: boolean;
    onBack: () => void;
    onSubmit: (
        payload: OrdenCompraServicioPayload,
        archivosPendientes: File[]
    ) => Promise<DocumentoPdfFormSubmitResult | void>;
}

const todayInput = () => new Date().toISOString().slice(0, 10);

const toDateInput = (value?: string | null) => {
    if (!value) return "";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    return date.toISOString().slice(0, 10);
};

const toNumber = (value: unknown) => {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
};

const toMoney = (value: number) => {
    return new Intl.NumberFormat("es-PE", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(Number.isFinite(value) ? value : 0);
};

const roundDecimal = (value: number, decimals = 6) => {
    if (!Number.isFinite(value)) return 0;

    const factor = 10 ** decimals;
    return Math.round((value + Number.EPSILON) * factor) / factor;
};

const firstString = (source: Record<string, unknown>, keys: string[]) => {
    for (const key of keys) {
        const value = source[key];
        if (value !== null && value !== undefined && String(value).trim() !== "") {
            return String(value).trim();
        }
    }

    return "";
};

const getNested = (source: Record<string, unknown>, keys: string[]) => {
    for (const key of keys) {
        const value = source[key];
        if (value && typeof value === "object") return value as Record<string, unknown>;
    }

    return {};
};

const boolFromSource = (source: Record<string, unknown>) => {
    const value = source.incluyeIgv ?? source.incluye_igv ?? source.IncluyeIgv;
    return value === undefined || value === null ? true : Boolean(value);
};

const boolValueFromSource = (value: unknown, fallback = false) => {
    if (value === undefined || value === null || value === "") return fallback;
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value === 1;

    const normalized = String(value).trim().toLowerCase();
    return ["1", "true", "si", "sí", "afecto"].includes(normalized);
};

const getDetalleBien = (detalle: OrdenCompraServicioDetalle) => detalle.bien || detalle.Bien || {};
const getDetallePresentacion = (detalle: OrdenCompraServicioDetalle) => detalle.presentacion || detalle.Presentacion || {};

const getOperacionItem = (source: Record<string, unknown>) => {
    const id = firstString(source, ["operacionesItemId", "operacionesitemId", "OperacionesItemId"]);
    const nested = getNested(source, ["operacionesItem", "operacionItem", "operacionesitem", "operacionitem", "OperacionesItem", "OperacionItem"]);
    const nestedId = firstString(nested, ["operacionesItemId", "operacionesitemId", "OperacionesItemId"]);
    const label = firstString(nested, ["descripcion", "Descripcion"]);

    return { id: id || nestedId, label };
};

const detalleEsAfecto = (detalle: OrdenDetalleDraft) => {
    const operacionItemId = detalle.operacionItemId.trim();
    if (operacionItemId) return operacionItemId === "1000";

    return detalle.afectoInafecto;
};

const getDetalleConversionTotal = (detalle: OrdenDetalleDraft) => {
    if (detalle.conversionTotalDesdeBackend) return roundDecimal(toNumber(detalle.conversionTotal));

    return roundDecimal(toNumber(detalle.cantidad) * detalle.presentacionCantidad);
};

const getDetalleImporte = (detalle: OrdenDetalleDraft) => roundDecimal(toNumber(detalle.cantidad) * toNumber(detalle.costo));

const getDetalleNeto = (detalle: OrdenDetalleDraft) => {
    return getDetalleImporte(detalle);
};

const normalizeDetalles = (source?: Partial<OrdenCompraServicio>): OrdenDetalleDraft[] => {
    const detalles = source?.detalles || source?.Detalles || [];

    return detalles.map((detalle) => {
        const raw = detalle as Record<string, unknown>;
        const bien = getDetalleBien(detalle);
        const presentacion = getDetallePresentacion(detalle);
        const cantidad = firstString(raw, ["cantidad", "Cantidad"]) || "0";
        const costo = firstString(raw, ["costo", "Costo"]) || String(bien.costo || 0);
        const hasImporte = ["importe", "Importe"].some(key => raw[key] !== undefined && raw[key] !== null);
        const importe = firstString(raw, ["importe", "Importe"]);
        const hasConversionTotal = ["conversionTotal", "conversion_total", "ConversionTotal"].some(key => raw[key] !== undefined && raw[key] !== null);
        const conversionTotal = firstString(raw, ["conversionTotal", "conversion_total", "ConversionTotal"]);
        const cantidadNumero = toNumber(cantidad);
        const conversionNumero = toNumber(conversionTotal);
        const presentacionCantidad = toNumber(presentacion.cantidad) || (cantidadNumero > 0 && hasConversionTotal ? conversionNumero / cantidadNumero : 0) || 1;
        const operacionItem = getOperacionItem(bien);
        const afectoInafecto = boolValueFromSource(
            raw.afectoInafecto ?? raw.afecto_inafecto ?? raw.AfectoInafecto ?? bien.afecto_inafecto ?? bien.afectoInafecto,
            false
        );

        return {
            bienId: firstString(raw, ["bienId", "BienId"]) || String(bien.bienId || ""),
            bienLabel: String(bien.descripcion || firstString(raw, ["bienDescripcion", "descripcion"]) || "").trim(),
            bienCodigo: String(bien.codigo_existencia || bien.cod_admin || "").trim(),
            operacionItemId: operacionItem.id,
            operacionItemLabel: operacionItem.label,
            afectoInafecto,
            presentacionId: firstString(raw, ["presentacionId", "PresentacionId"]) || String(presentacion.presentacionId || ""),
            presentacionLabel: String(presentacion.descripcion || "").trim(),
            presentacionCantidad,
            cantidad,
            costo,
            conversionTotal: hasConversionTotal ? conversionTotal : "",
            conversionTotalDesdeBackend: hasConversionTotal,
            importe,
            importeDesdeBackend: hasImporte,
            observacion: firstString(raw, ["observacion", "Observacion"])
        };
    });
};

const normalizeOrden = (source?: Partial<OrdenCompraServicio>): OrdenFormValue => {
    const raw = (source || {}) as Record<string, unknown>;
    const tipoOrdenObject = getNested(raw, ["tipoOrden", "tipoOrdenDetalle", "TipoOrdenDetalle"]);

    return {
        ordenCompraServicioId: firstString(raw, ["ordenCompraServicioId", "ordencompraservicioId", "OrdenCompraServicioId", "ordencompraservicio_id"]),
        numeroOrdenCompra: firstString(raw, ["numeroOrdenCompra", "numero_ordencompra", "NumeroOrdenCompra"]),
        tipoOrden: firstString(raw, ["tipoOrdenId", "tipo_orden"]) || firstString(tipoOrdenObject, ["tipoOrdenId", "tipoOrden", "TipoOrden"]),
        pedidoCompraId: firstString(raw, ["pedidoCompraId", "pedidocompraId", "PedidoCompraId"]),
        numeroCotizacion: firstString(raw, ["numeroCotizacion", "numero_cotizacion", "NumeroCotizacion"]),
        fotoCotizacion: firstString(raw, ["fotoCotizacion", "foto_cotizacion", "FotoCotizacion"]),
        fechaEmision: toDateInput(firstString(raw, ["fechaEmision", "fecha_emision", "FechaEmision"])) || todayInput(),
        fechaEntrega: toDateInput(firstString(raw, ["fechaEntrega", "fecha_entrega", "FechaEntrega"])) || todayInput(),
        monedaId: firstString(raw, ["monedaId", "MonedaId"]) || "001",
        tipoCambio: firstString(raw, ["tipoCambio", "tipo_cambio", "TipoCambio"]) || "1",
        subtotalAfecto: firstString(raw, ["subtotalAfecto", "subtotal_afecto", "SubtotalAfecto", "valorventaAfecto", "valorventa_afecto", "ValorventaAfecto"]) || "0",
        subtotalExonerado: firstString(raw, ["subtotalExonerado", "subtotal_exonerado", "SubtotalExonerado", "valorventaExonerado", "valorventa_exonerado", "ValorventaExonerado", "subtotalInafecto", "subtotal_inafecto", "SubtotalInafecto"]) || "0",
        descuentoGlobal: firstString(raw, ["descuentoGlobal", "descuento_global", "DescuentoGlobal"]) || "0",
        tipoPagoId: firstString(raw, ["tipoPagoId", "tipopagoId", "TipoPagoId"]),
        proveedorId: firstString(raw, ["proveedorId", "ProveedorId"]),
        observacion: firstString(raw, ["observacion", "Observacion"]),
        lugarEntrega: firstString(raw, ["lugarEntrega", "lugar_entrega", "LugarEntrega"]),
        trabajadorId: firstString(raw, ["trabajadorId", "TrabajadorId"]),
        estado: firstString(raw, ["estado", "Estado"]) || "REGISTRADO",
        incluyeIgv: boolFromSource(raw),
        detalles: normalizeDetalles(source)
    };
};

const currencyIdOf = (currency: Moneda) => currency.monedaId || currency.MonedaId || "";
const currencyLabelOf = (currency: Moneda) => currency.descripcion || currency.Descripcion || "";
const currencySymbolOf = (currency?: Moneda) => (
    currency?.simbolomoneda
    || currency?.Simbolomoneda
    || currency?.simbolo
    || currency?.Simbolo
    || currency?.abreviatura
    || currency?.Abreviatura
    || ""
);
const currencyExchangeRateOf = (currency?: Moneda) => {
    const exchange = currency?.tipoCambioUniversal || currency?.TipoCambioUniversal;
    const rate = toNumber(exchange?.tc_venta);
    return rate > 0 ? rate : 1;
};

const FormInput = ({
    label,
    name,
    value,
    onChange,
    disabled,
    type = "text",
    className = "",
    ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) => (
    <div className="flex w-full flex-col gap-1.5">
        <label className="ml-1 text-[10px] font-bold uppercase text-slate-500">{label}</label>
        <input
            name={name}
            value={value ?? ""}
            onChange={onChange}
            disabled={disabled}
            type={type}
            className={`h-[38px] w-full rounded-lg border p-2.5 text-xs outline-none transition-all focus:ring-2 focus:ring-blue-500 ${
                disabled
                    ? "cursor-not-allowed border-slate-200 bg-slate-100 font-bold text-slate-500"
                    : "border-slate-200 bg-white text-slate-800"
            } ${className}`}
            {...props}
        />
    </div>
);

const SectionTitle = ({ title, icon: Icon }: { title: string; icon: typeof IconFileInvoice }) => (
    <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <Icon size={18} className="text-blue-600" />
        <h3 className="text-xs font-bold uppercase tracking-wide text-slate-800">{title}</h3>
    </div>
);

export default function OrdenCompraServicioForm({
    title,
    subtitle,
    submitText,
    initialValue,
    readOnly = false,
    onBack,
    onSubmit
}: OrdenCompraServicioFormProps) {
    const [formData, setFormData] = useState<OrdenFormValue>(() => normalizeOrden(initialValue));
    const [saving, setSaving] = useState(false);
    const [archivosPendientes, setArchivosPendientes] = useState<File[]>([]);
    const [adjuntosRefreshKey, setAdjuntosRefreshKey] = useState(0);
    const [currencyOptions, setCurrencyOptions] = useState<SelectOption[]>([]);
    const [presentacionOptions, setPresentacionOptions] = useState<SelectOption[]>([]);
    const [addForm, setAddForm] = useState<OrdenDetalleDraft>({
        bienId: "",
        bienLabel: "",
        bienCodigo: "",
        operacionItemId: "",
        operacionItemLabel: "",
        afectoInafecto: false,
        presentacionId: "",
        presentacionLabel: "",
        presentacionCantidad: 1,
        cantidad: "1",
        costo: "0",
        conversionTotal: "",
        conversionTotalDesdeBackend: false,
        importe: "",
        importeDesdeBackend: false,
        observacion: ""
    });

    const isEditing = Boolean(formData.ordenCompraServicioId);
    const isAnulado = formData.estado.trim().toUpperCase() === "ANULADO";
    const isReadOnly = readOnly || isAnulado;

    useEffect(() => {
        setFormData(normalizeOrden(initialValue));
    }, [initialValue]);

    useEffect(() => {
        let mounted = true;

        const loadCurrencies = async () => {
            const response = await monedaService.getAll(1, 20);
            if (!mounted || !response.isSuccess) return;

            const currencies = response.data || [];
            setCurrencyOptions(currencies.map(currency => ({
                key: currencyIdOf(currency),
                value: currencyIdOf(currency),
                label: currencyLabelOf(currency),
                aux: currencySymbolOf(currency),
                raw: currency
            })).filter(option => option.value));

            setFormData(previous => {
                if (previous.ordenCompraServicioId) return previous;

                const selectedCurrency = currencies.find(
                    currency => currencyIdOf(currency) === previous.monedaId
                );
                return {
                    ...previous,
                    tipoCambio: String(currencyExchangeRateOf(selectedCurrency))
                };
            });
        };

        void loadCurrencies();
        return () => { mounted = false; };
    }, []);

    const totals = useMemo(() => {
        let sumaAfectoBruto = 0;
        let sumaExoneradoBruto = 0;

        formData.detalles.forEach(detalle => {
            const neto = getDetalleNeto(detalle);
            if (detalleEsAfecto(detalle)) {
                sumaAfectoBruto += neto;
            } else {
                sumaExoneradoBruto += neto;
            }
        });

        if (formData.detalles.length === 0) {
            const subtotalAfecto = roundDecimal(toNumber(formData.subtotalAfecto));
            const subtotalExonerado = roundDecimal(toNumber(formData.subtotalExonerado));
            const subtotal = roundDecimal(subtotalAfecto + subtotalExonerado);
            const igv = roundDecimal(subtotalAfecto * IGV_RATE);

            return {
                subtotalAfecto,
                subtotalExonerado,
                subtotal,
                igv,
                total: roundDecimal(subtotal + igv)
            };
        }

        const brutoTotal = sumaAfectoBruto + sumaExoneradoBruto;
        const descuentoGlobal = toNumber(formData.descuentoGlobal);
        const baseTotal = roundDecimal(Math.max(brutoTotal - descuentoGlobal, 0));
        const afectoRatio = brutoTotal > 0 ? sumaAfectoBruto / brutoTotal : 0;

        // Bases (con descuento global ya prorrateado) de cada grupo tributario.
        const sumaSubTotalAfecto = roundDecimal(baseTotal * afectoRatio);
        const subtotalExonerado = roundDecimal(baseTotal - sumaSubTotalAfecto);

        let subtotalAfecto: number;

        if (formData.incluyeIgv) {
            // El precio del producto ya incluye el IGV: se extrae del monto afecto.
            subtotalAfecto = roundDecimal(sumaSubTotalAfecto / (1 + IGV_RATE));
        } else {
            // El precio del producto no incluye IGV: se suma sobre el monto afecto.
            subtotalAfecto = sumaSubTotalAfecto;
        }

        const igv = roundDecimal(subtotalAfecto * IGV_RATE);

        return {
            subtotalAfecto,
            subtotalExonerado,
            subtotal: roundDecimal(subtotalAfecto + subtotalExonerado),
            igv,
            total: roundDecimal(subtotalAfecto + subtotalExonerado + igv)
        };
    }, [formData.detalles, formData.descuentoGlobal, formData.incluyeIgv, formData.subtotalAfecto, formData.subtotalExonerado]);

    const fallbackLabels = useMemo(() => {
        const raw = (initialValue || {}) as Record<string, unknown>;
        const proveedor = getNested(raw, ["proveedor", "Proveedor"]);
        const moneda = getNested(raw, ["moneda", "Moneda"]);
        const tipoPago = getNested(raw, ["tipoPago", "TipoPago"]);
        const tipoOrden = getNested(raw, ["tipoOrden", "tipoOrdenDetalle", "TipoOrdenDetalle"]);
        const trabajador = getNested(raw, ["trabajador", "Trabajador"]);
        const trabajadorNombre = [trabajador.nombres, trabajador.apellidos].filter(Boolean).join(" ").trim();
        const selectedCurrency = currencyOptions.find(
            option => String(option.value) === formData.monedaId
        );

        return {
            proveedor: String(proveedor.descripcion || formData.proveedorId || ""),
            moneda: String(
                moneda.descripcion
                || selectedCurrency?.label
                || (formData.monedaId ? "Cargando moneda..." : "")
            ),
            tipoPago: String(tipoPago.descripcion || formData.tipoPagoId || ""),
            tipoOrden: String(tipoOrden.descripcion || formData.tipoOrden || ""),
            trabajador: String(trabajador.descripcion || trabajadorNombre || formData.trabajadorId || "")
        };
    }, [currencyOptions, formData.monedaId, formData.proveedorId, formData.tipoOrden, formData.tipoPagoId, formData.trabajadorId, initialValue]);

    const selectedCurrency = currencyOptions.find(
        option => String(option.value) === formData.monedaId
    )?.raw as Moneda | undefined;
    const currencySymbol = currencySymbolOf(selectedCurrency)
        || firstString(
            getNested((initialValue || {}) as Record<string, unknown>, ["moneda", "Moneda"]),
            ["simbolomoneda", "simbolo", "abreviatura"]
        )
        || "S/";

    const handleChange = (event: { target: { name?: string; value: string | number; checked?: boolean; type?: string } }) => {
        const name = event.target.name;
        if (!name) return;

        const value = event.target.type === "checkbox"
            ? Boolean(event.target.checked)
            : String(event.target.value ?? "");

        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleCurrencyChange = (currencyId: string, option?: SelectOption) => {
        const currency = option?.raw as Moneda | undefined;
        setFormData(previous => ({
            ...previous,
            monedaId: currencyId,
            tipoCambio: String(currencyExchangeRateOf(currency))
        }));
    };

    const fetchTipoOrdenOptions = async (term: string): Promise<SelectOption[]> => {
        const response = await tipoOrdenService.getAll(1, 20, term, { FiltroEstado: true });
        if (!response.isSuccess) return [];

        return (response.data || []).map((item: TipoOrden) => {
            const raw = item as Record<string, unknown>;
            const id = firstString(raw, ["tipoOrdenId", "tipoOrden", "tipo_orden", "TipoOrden", "tipoordenId", "key"]);
            const label = firstString(raw, ["descripcion", "Descripcion", "nombre", "value"]) || id;

            return { key: id, value: id, label, raw: item };
        }).filter(item => item.value);
    };

    const fetchTipoPagoOptions = async (term: string): Promise<SelectOption[]> => {
        const response = await tipoPagoService.getAll(1, 20, term, { FiltroEstado: true });
        if (!response.isSuccess) return [];

        return (response.data || []).map((item: TipoPago) => {
            const raw = item as Record<string, unknown>;
            const id = firstString(raw, ["tipopagoId", "tipoPagoId", "TipoPagoId", "key"]);
            const label = firstString(raw, ["descripcion", "Descripcion", "nombre", "value"]) || id;

            return { key: id, value: id, label, raw: item };
        }).filter(item => item.value);
    };

    const fetchProveedorOptions = async (term: string): Promise<SelectOption[]> => {
        const response = await proveedorService.getAll(1, 20, term, { estado: [1] });
        if (!response.isSuccess) return [];

        return (response.data || []).map((item: Proveedor) => ({
            key: item.proveedorId || item.ProveedorId || "",
            value: item.proveedorId || item.ProveedorId || "",
            label: item.descripcion || item.Descripcion || item.proveedorId || item.ProveedorId || "SIN PROVEEDOR",
            aux: item.numeroDoc || item.NumeroDoc || item.numero_doc,
            raw: item
        })).filter(item => String(item.value).trim() !== "");
    };

    const fetchTrabajadorOptions = async (term: string): Promise<SelectOption[]> => {
        const response = await trabajadorService.getAll(EMPRESA_ID, 1, 20, term);
        if (!response.isSuccess) return [];

        return (response.data || []).map((item: Trabajador) => {
            const raw = item as Record<string, unknown>;
            const id = firstString(raw, ["trabajadorId", "TrabajadorId", "key"]);
            const label = firstString(raw, ["descripcion", "Descripcion", "nombres_apellidos"]) ||
                [raw.nombres, raw.apellidos].filter(Boolean).join(" ").trim() ||
                id;

            return {
                key: id,
                value: id,
                label,
                aux: [firstString(raw, ["docidentId"]), firstString(raw, ["numeroDoc", "numero_doc"])].filter(Boolean).join(" "),
                raw: item
            };
        }).filter(item => item.value);
    };

    const fetchPresentaciones = async (bienId: string) => {
        if (!bienId) {
            setPresentacionOptions([]);
            return;
        }

        try {
            const response = await presentacionService.getByBien(bienId, true);

            setPresentacionOptions(response.isSuccess ? (response.data || []).map((presentacion) => ({
                key: String(presentacion.presentacionId || "").trim(),
                value: String(presentacion.presentacionId || "").trim(),
                label: String(presentacion.descripcion || presentacion.unidadmedidaId || "").trim(),
                aux: presentacion.cantidad,
                raw: presentacion
            })).filter(item => item.value) : []);
        } catch {
            toast.error("No se pudieron cargar las presentaciones del producto.");
        }
    };

    const setPresentacionesFromProducto = (producto?: Producto) => {
        const presentaciones = (producto?.presentaciones || [])
            .filter((presentacion) => presentacion.estado !== false)
            .map((presentacion) => ({
                key: String(presentacion.presentacionId || "").trim(),
                value: String(presentacion.presentacionId || "").trim(),
                label: String(presentacion.descripcion || presentacion.unidadmedidaId || "").trim(),
                aux: presentacion.cantidad,
                raw: presentacion
            }))
            .filter(item => item.value);

        setPresentacionOptions(presentaciones);
        return presentaciones.length > 0;
    };

    const resetAddForm = () => {
        setAddForm({
            bienId: "",
            bienLabel: "",
            bienCodigo: "",
            operacionItemId: "",
            operacionItemLabel: "",
            afectoInafecto: false,
            presentacionId: "",
            presentacionLabel: "",
            presentacionCantidad: 1,
            cantidad: "1",
            costo: "0",
            conversionTotal: "",
            conversionTotalDesdeBackend: false,
            importe: "",
            importeDesdeBackend: false,
            observacion: ""
        });
        setPresentacionOptions([]);
    };

    const handleProductoChange = async (value: string | number, option?: SelectOption) => {
        const producto = option?.raw as Producto | undefined;
        const bienId = String(value || "").trim();
        const costo = Number(producto?.costo ?? 0);
        const operacionItem = getOperacionItem((producto || {}) as Record<string, unknown>);
        const afectoInafecto = boolValueFromSource(producto?.afecto_inafecto, false);

        setAddForm(prev => ({
            ...prev,
            bienId,
            bienLabel: String(option?.label || producto?.descripcion || "").trim(),
            bienCodigo: String(option?.aux || producto?.codigo_existencia || "").trim(),
            operacionItemId: operacionItem.id,
            operacionItemLabel: operacionItem.label,
            afectoInafecto,
            presentacionId: "",
            presentacionLabel: "",
            presentacionCantidad: 1,
            conversionTotal: "",
            conversionTotalDesdeBackend: false,
            importe: "",
            importeDesdeBackend: false,
            costo: Number.isFinite(costo) ? String(costo) : "0"
        }));

        if (!setPresentacionesFromProducto(producto)) {
            await fetchPresentaciones(bienId);
        }
    };

    const handlePresentacionChange = (value: string | number) => {
        const presentacionId = String(value || "").trim();
        const option = presentacionOptions.find(item => String(item.value) === presentacionId);
        const raw = option?.raw as { cantidad?: number | string } | undefined;
        const presentacionCantidad = toNumber(raw?.cantidad ?? option?.aux) || 1;

        setAddForm(prev => ({
            ...prev,
            presentacionId,
            presentacionLabel: String(option?.label || "").trim(),
            presentacionCantidad,
            conversionTotal: "",
            conversionTotalDesdeBackend: false,
            importe: "",
            importeDesdeBackend: false
        }));
    };

    const existsCombination = (bienId: string, presentacionId: string) => {
        return formData.detalles.some(detalle => (
            detalle.bienId === bienId && detalle.presentacionId === presentacionId
        ));
    };

    const handleAddDetalle = () => {
        if (!addForm.bienId || !addForm.presentacionId) {
            toast.warning("Seleccione producto y presentación.");
            return;
        }

        if (existsCombination(addForm.bienId, addForm.presentacionId)) {
            toast.warning("Este producto con la misma presentación ya existe en la orden.");
            return;
        }

        if (toNumber(addForm.cantidad) <= 0) {
            toast.warning("La cantidad debe ser mayor a cero.");
            return;
        }

        if (toNumber(addForm.costo) < 0) {
            toast.warning("El precio de compra no puede ser negativo.");
            return;
        }

        setFormData(prev => ({
            ...prev,
            detalles: [...prev.detalles, addForm]
        }));
        toast.success("Producto agregado a la orden.");
        resetAddForm();
    };

    const updateDetalle = (index: number, field: "cantidad" | "costo", value: string) => {
        if (isReadOnly) return;

        setFormData(prev => ({
            ...prev,
            detalles: prev.detalles.map((detalle, idx) => (
                idx === index ? {
                    ...detalle,
                    [field]: value,
                    conversionTotal: field === "cantidad" ? "" : detalle.conversionTotal,
                    conversionTotalDesdeBackend: field === "cantidad" ? false : detalle.conversionTotalDesdeBackend,
                    importe: field === "cantidad" || field === "costo" ? "" : detalle.importe,
                    importeDesdeBackend: field === "cantidad" || field === "costo" ? false : detalle.importeDesdeBackend
                } : detalle
            ))
        }));
    };

    const removeDetalle = (index: number) => {
        if (isReadOnly) return;

        setFormData(prev => ({
            ...prev,
            detalles: prev.detalles.filter((_, idx) => idx !== index)
        }));
    };

    const buildPayload = (): OrdenCompraServicioPayload => ({
        ordenCompraServicioId: formData.ordenCompraServicioId || undefined,
        tipoOrden: formData.tipoOrden.trim(),
        pedidoCompraId: formData.pedidoCompraId.trim() || null,
        numeroCotizacion: formData.numeroCotizacion.trim() || null,
        fotoCotizacion: isEditing ? formData.fotoCotizacion.trim() || null : null,
        fechaEmision: formData.fechaEmision,
        fechaEntrega: formData.fechaEntrega,
        monedaId: formData.monedaId.trim() || null,
        tipoCambio: roundDecimal(toNumber(formData.tipoCambio)),
        subtotal: roundDecimal(totals.subtotal),
        subtotalAfecto: roundDecimal(totals.subtotalAfecto),
        subtotalExonerado: roundDecimal(totals.subtotalExonerado),
        igv: roundDecimal(totals.igv),
        total: roundDecimal(totals.total),
        descuentoGlobal: roundDecimal(toNumber(formData.descuentoGlobal)),
        tipoPagoId: formData.tipoPagoId.trim() || null,
        proveedorId: formData.proveedorId.trim() || null,
        observacion: formData.observacion.trim() || null,
        lugarEntrega: formData.lugarEntrega.trim() || null,
        trabajadorId: formData.trabajadorId.trim() || null,
        estado: formData.estado.trim() || "REGISTRADO",
        cuentaUsuarioId: USER_ID,
        incluyeIgv: formData.incluyeIgv,
        detalles: formData.detalles.map(detalle => ({
            bienId: detalle.bienId,
            presentacionId: detalle.presentacionId,
            cantidad: roundDecimal(toNumber(detalle.cantidad)),
            costo: roundDecimal(toNumber(detalle.costo)),
            conversionTotal: roundDecimal(getDetalleConversionTotal(detalle)),
            importe: roundDecimal(getDetalleImporte(detalle)),
            descuentoProducto: 0,
            afectoInafecto: detalle.afectoInafecto,
            observacion: detalle.observacion.trim() || null
        }))
    });

    const validate = () => {
        if (!isEditing && !formData.tipoOrden) return "El tipo de orden es obligatorio.";
        if (!formData.fechaEmision) return "La fecha de emisión es obligatoria.";
        if (!formData.fechaEntrega) return "La fecha de entrega es obligatoria.";
        if (formData.fechaEntrega < formData.fechaEmision) return "La fecha de entrega no puede ser menor que la fecha de emisión.";
        if (!formData.monedaId) return "La moneda es obligatoria.";
        if (toNumber(formData.tipoCambio) <= 0) return "El tipo de cambio debe ser mayor a cero.";
        if (!formData.tipoPagoId) return "El tipo de pago es obligatorio.";
        if (!formData.proveedorId) return "El proveedor es obligatorio.";
        if (toNumber(formData.descuentoGlobal) < 0) return "El descuento global no puede ser negativo.";
        if (formData.detalles.length === 0) return "La orden debe contener al menos un producto.";

        const invalidIndex = formData.detalles.findIndex(detalle => (
            !detalle.bienId ||
            !detalle.presentacionId ||
            toNumber(detalle.cantidad) <= 0 ||
            toNumber(detalle.costo) < 0 ||
            getDetalleImporte(detalle) < 0
        ));

        if (invalidIndex >= 0) return `Revise el detalle ${invalidIndex + 1}: producto, presentación, cantidad y precio son obligatorios.`;

        return "";
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (isReadOnly || saving) return;

        const error = validate();
        if (error) {
            toast.error(error);
            return;
        }

        setSaving(true);

        try {
            const result = await onSubmit(buildPayload(), archivosPendientes);
            if (result) {
                setArchivosPendientes(result.archivosPendientes);
                if (result.refreshAdjuntos) {
                    setAdjuntosRefreshKey(previous => previous + 1);
                }
            }
        } finally {
            setSaving(false);
        }
    };

    const addTotalPresentacion = toNumber(addForm.cantidad) * addForm.presentacionCantidad;
    const addTotal = toNumber(addForm.cantidad) * toNumber(addForm.costo);

    return (
        <div className="p-6 animate-fade-in-up">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                    <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-blue-600">
                        <IconClipboardList size={15} />
                        <span>Módulo Compras</span>
                        <span className="text-slate-300">/</span>
                        <span className="text-slate-500">{isEditing ? "Orden" : "Nueva Orden"}</span>
                    </div>
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

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="overflow-hidden rounded-xl border border-sky-100 bg-white shadow-sm">
                    <div className="flex flex-col gap-3 border-b border-sky-100 bg-sky-50 px-4 py-3 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-black uppercase text-slate-700">N°:</span>
                            <span className="font-mono text-lg font-black text-sky-700">
                                {formData.numeroOrdenCompra || formData.ordenCompraServicioId || "PENDIENTE"}
                            </span>
                        </div>
                        <div className="flex gap-2">
                            {!isReadOnly && (
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-emerald-700 disabled:opacity-60"
                                >
                                    {saving ? <IconLoader size={17} className="animate-spin" /> : <IconDeviceFloppy size={17} />}
                                    {submitText}
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={onBack}
                                className="rounded-lg bg-red-500 px-4 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-red-600"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 p-4 xl:grid-cols-[1fr_270px]">
                        <div className="space-y-5">
                            <section className="space-y-4">
                                <SectionTitle title="Cabecera de compra" icon={IconCalendar} />
                                <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
                                    <SearchableSelect
                                        label="Tipo Orden"
                                        name="tipoOrden"
                                        value={formData.tipoOrden}
                                        fetchCustom={fetchTipoOrdenOptions}
                                        fallbackLabel={fallbackLabels.tipoOrden}
                                        onChange={handleChange}
                                        disabled={isReadOnly || isEditing}
                                    />
                                    <SearchableSelect
                                        label="Proveedor"
                                        name="proveedorId"
                                        value={formData.proveedorId}
                                        fetchCustom={fetchProveedorOptions}
                                        fallbackLabel={fallbackLabels.proveedor}
                                        onChange={handleChange}
                                        disabled={isReadOnly}
                                        placeholder="Buscar proveedor..."
                                    />
                                    <SearchableSelect
                                        label="Tipo Pago"
                                        name="tipoPagoId"
                                        value={formData.tipoPagoId}
                                        fetchCustom={fetchTipoPagoOptions}
                                        fallbackLabel={fallbackLabels.tipoPago}
                                        onChange={handleChange}
                                        disabled={isReadOnly}
                                    />
                                    <SearchableSelect
                                        label="Moneda"
                                        name="monedaId"
                                        value={formData.monedaId}
                                        options={currencyOptions}
                                        fallbackLabel={fallbackLabels.moneda}
                                        onChange={event => handleCurrencyChange(
                                            String(event.target.value),
                                            event.option as SelectOption | undefined
                                        )}
                                        disabled={isReadOnly}
                                    />
                                </div>

                                <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
                                    <FormInput label="Fecha Emisión" name="fechaEmision" type="date" value={formData.fechaEmision} onChange={handleChange} disabled={isReadOnly} />
                                    <FormInput label="Fecha Entrega" name="fechaEntrega" type="date" min={formData.fechaEmision} value={formData.fechaEntrega} onChange={handleChange} disabled={isReadOnly} />
                                    <SearchableSelect
                                        label="Responsable de Compra"
                                        name="trabajadorId"
                                        value={formData.trabajadorId}
                                        fetchCustom={fetchTrabajadorOptions}
                                        fallbackLabel={fallbackLabels.trabajador}
                                        onChange={handleChange}
                                        disabled={isReadOnly}
                                        placeholder="-Seleccione-"
                                    />
                                    <DocumentoAdjuntosPanel
                                        compact
                                        referenciaId={formData.ordenCompraServicioId || undefined}
                                        referenciaTabla={DOCUMENTO_PDF_REFERENCIAS.ORDEN_COMPRA_SERVICIO}
                                        readOnly={isReadOnly}
                                        disabled={saving}
                                        refreshKey={adjuntosRefreshKey}
                                        archivosPendientes={archivosPendientes}
                                        onArchivosPendientesChange={setArchivosPendientes}
                                    />
                                </div>

                                <div className="grid grid-cols-1 gap-4 lg:grid-cols-[210px_1fr_430px]">
                                    <FormInput label="N° Cotización" name="numeroCotizacion" value={formData.numeroCotizacion} onChange={handleChange} disabled={isReadOnly} maxLength={45} />
                                    <FormInput label="Observaciones" name="observacion" value={formData.observacion} onChange={handleChange} disabled={isReadOnly} maxLength={1000} />
                                    <div className="flex flex-col gap-1.5">
                                        <span className="ml-1 text-[10px] font-bold uppercase text-red-500">Va a incluir IGV ?</span>
                                        <div className={`flex h-[38px] items-center gap-5 rounded-lg border px-4 text-xs font-bold ${
                                            isReadOnly ? "border-slate-200 bg-slate-100 text-slate-500" : "border-slate-200 bg-white text-slate-700"
                                        }`}>
                                            <label className="flex items-center gap-2">
                                                <input type="radio" name="incluyeIgv" checked={formData.incluyeIgv} disabled={isReadOnly} onChange={() => setFormData(prev => ({ ...prev, incluyeIgv: true }))} />
                                                SI
                                            </label>
                                            <label className="flex items-center gap-2">
                                                <input type="radio" name="incluyeIgv" checked={!formData.incluyeIgv} disabled={isReadOnly} onChange={() => setFormData(prev => ({ ...prev, incluyeIgv: false }))} />
                                                NO
                                            </label>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_210px]">
                                    <FormInput label="Lugar Entrega" name="lugarEntrega" value={formData.lugarEntrega} onChange={handleChange} disabled={isReadOnly} maxLength={1000} />
                                    <FormInput label="Descuento Global" name="descuentoGlobal" type="number" min="0" step="0.01" value={formData.descuentoGlobal} onChange={handleChange} disabled={isReadOnly} />
                                </div>
                            </section>
                        </div>

                        <aside className="space-y-3 rounded-xl border border-blue-200 bg-white p-4">
                            <FormInput
                                label="Tipo Cambio"
                                type="text"
                                value={[currencySymbol, formData.tipoCambio].filter(Boolean).join(" ")}
                                disabled
                            />
                            <div className="rounded-lg border border-blue-100 bg-blue-50/40 p-3">
                                <div className="space-y-4 text-sm">
                                    <div>
                                        <p className="text-xs font-black uppercase text-slate-800">Subtotal (Afecto):</p>
                                        <p className="mt-1 text-lg font-black text-slate-900">{currencySymbol} {toMoney(totals.subtotalAfecto)}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-black uppercase text-slate-800">Subtotal (Exonerado):</p>
                                        <p className="mt-1 text-lg font-black text-slate-900">{currencySymbol} {toMoney(totals.subtotalExonerado)}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-black uppercase text-slate-800">IGV:</p>
                                        <p className="mt-1 text-lg font-black text-slate-900">{currencySymbol} {toMoney(totals.igv)}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs font-black uppercase text-slate-800">Total:</p>
                                        <p className="mt-1 text-xl font-black text-blue-700">{currencySymbol} {toMoney(totals.total)}</p>
                                    </div>
                                </div>
                            </div>
                        </aside>
                    </div>
                </div>

                <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                    <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-2">
                        <div className="flex items-center gap-2 text-slate-800">
                            <IconPackage className="text-blue-600" size={20} />
                            <h3 className="text-sm font-bold uppercase tracking-wide">Detalle de Productos</h3>
                        </div>
                        <span className="text-xs font-bold text-slate-400">{formData.detalles.length} producto(s)</span>
                    </div>

                    <div className="overflow-visible min-h-[250px]">
                        <table className="w-full min-w-[920px] text-left text-xs">
                            <thead className="bg-slate-50 font-semibold uppercase text-slate-500">
                                <tr>
                                    <th className="w-8 p-3">#</th>
                                    <th className="w-[30%] p-3">Producto</th>
                                    <th className="w-44 p-3">Presentación</th>
                                    <th className="w-24 p-3 text-right">Cant.</th>
                                    <th className="w-28 p-3 text-right">Precio Compra</th>
                                    <th className="w-28 p-3 text-right">Total</th>
                                    {!isReadOnly && <th className="w-14 p-3 text-center">Acc.</th>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {!isReadOnly && (
                                    <tr className="align-top transition-colors hover:bg-slate-50">
                                        <td className="p-3 text-center font-mono text-slate-400">+</td>
                                        <td className="p-3">
                                            <SearchableSelect
                                                name="bienId"
                                                value={addForm.bienId}
                                                fallbackLabel={addForm.bienLabel}
                                                fetchCustom={async (term) => {
                                                    const response = await productoService.getByEmpresa(EMPRESA_ID, 1, 20, term, null, true);
                                                    return response.isSuccess ? (response.data || []).map((producto: Producto) => ({
                                                        key: String(producto.bienId || "").trim(),
                                                        value: String(producto.bienId || "").trim(),
                                                        label: String(producto.descripcion || "").trim(),
                                                        aux: String(producto.codigo_existencia || "").trim(),
                                                        raw: producto
                                                    })) : [];
                                                }}
                                                onChange={(event) => handleProductoChange(event.target.value, (event as unknown as { option?: SelectOption }).option)}
                                                placeholder="Buscar producto"
                                            />
                                            {addForm.operacionItemLabel && (
                                                <p className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[9px] font-bold uppercase leading-tight ${
                                                    detalleEsAfecto(addForm) ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"
                                                }`}>
                                                    {addForm.operacionItemLabel}
                                                </p>
                                            )}
                                        </td>
                                        <td className="p-3">
                                            <SearchableSelect
                                                name="presentacionId"
                                                value={addForm.presentacionId}
                                                options={presentacionOptions}
                                                fallbackLabel={addForm.presentacionLabel}
                                                onChange={(event) => handlePresentacionChange(event.target.value)}
                                                disabled={!addForm.bienId || presentacionOptions.length === 0}
                                            />
                                            <p className="mt-1 text-right font-mono text-[10px] font-bold text-slate-400">
                                                Conv. Total: {toMoney(addTotalPresentacion)}
                                            </p>
                                        </td>
                                        <td className="p-3">
                                            <input
                                                type="number"
                                                min="0.01"
                                                step="0.01"
                                                value={addForm.cantidad}
                                                onChange={(event) => setAddForm(prev => ({ ...prev, cantidad: event.target.value }))}
                                                className="h-[38px] w-full rounded-lg border border-slate-200 bg-white p-2 text-right font-mono text-xs font-bold outline-none focus:border-blue-500"
                                            />
                                        </td>
                                        <td className="p-3">
                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={addForm.costo}
                                                onChange={(event) => setAddForm(prev => ({ ...prev, costo: event.target.value }))}
                                                className="h-[38px] w-full rounded-lg border border-slate-200 bg-white p-2 text-right font-mono text-xs font-bold outline-none focus:border-blue-500"
                                            />
                                        </td>
                                        <td className="p-3">
                                            <input
                                                value={addTotal.toFixed(2)}
                                                disabled
                                                className="h-[38px] w-full rounded-lg border border-slate-200 bg-slate-50 p-2 text-right font-mono text-xs font-bold text-slate-500"
                                            />
                                        </td>
                                        <td className="p-3 text-center">
                                            <button
                                                type="button"
                                                onClick={handleAddDetalle}
                                                className="inline-flex h-[38px] w-[38px] items-center justify-center rounded-lg bg-blue-50 text-blue-700 transition-colors hover:bg-blue-100 active:scale-95"
                                                title="Agregar producto"
                                            >
                                                <IconPlus size={17} />
                                            </button>
                                        </td>
                                    </tr>
                                )}

                                {formData.detalles.length === 0 ? (
                                    <tr>
                                        <td colSpan={isReadOnly ? 6 : 7} className="p-8 text-center italic text-slate-400">
                                            No hay items. Agregue productos al detalle.
                                        </td>
                                    </tr>
                                ) : (
                                    formData.detalles.map((detalle, index) => {
                                        const conversionTotal = getDetalleConversionTotal(detalle);
                                        const importe = getDetalleImporte(detalle);

                                        return (
                                            <tr key={`${detalle.bienId}-${detalle.presentacionId}-${index}`} className="transition-colors hover:bg-slate-50">
                                                <td className="p-3 text-center font-mono text-slate-400">{index + 1}</td>
                                                <td className="p-3 py-4">
                                                    <p className="font-bold text-slate-700">{detalle.bienLabel || detalle.bienId}</p>
                                                    {detalle.bienCodigo && <p className="mt-0.5 font-mono text-[10px] text-slate-400">{detalle.bienCodigo}</p>}
                                                    {detalle.operacionItemLabel && (
                                                        <p className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[9px] font-bold uppercase leading-tight ${
                                                            detalleEsAfecto(detalle) ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"
                                                        }`}>
                                                            {detalle.operacionItemLabel}
                                                        </p>
                                                    )}
                                                </td>
                                                <td className="p-3 font-semibold text-slate-700">
                                                    <span>{detalle.presentacionLabel || detalle.presentacionId}</span>
                                                    <p className="mt-1 font-mono text-[10px] font-bold text-slate-400">
                                                        Conv. Total: {toMoney(conversionTotal)}
                                                    </p>
                                                </td>
                                                <td className="p-3 text-right">
                                                    {isReadOnly ? (
                                                        <span className="font-mono font-bold text-slate-700">{toMoney(toNumber(detalle.cantidad))}</span>
                                                    ) : (
                                                        <input
                                                            type="number"
                                                            min="0.01"
                                                            step="0.01"
                                                            value={detalle.cantidad}
                                                            onChange={(event) => updateDetalle(index, "cantidad", event.target.value)}
                                                            className="h-[34px] w-24 rounded-lg border border-slate-200 bg-white p-2 text-right font-mono text-xs font-bold outline-none focus:border-blue-500"
                                                        />
                                                    )}
                                                </td>
                                                <td className="p-3 text-right">
                                                    {isReadOnly ? (
                                                        <span className="font-mono font-bold text-slate-700">{toMoney(toNumber(detalle.costo))}</span>
                                                    ) : (
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="0.01"
                                                            value={detalle.costo}
                                                            onChange={(event) => updateDetalle(index, "costo", event.target.value)}
                                                            className="h-[34px] w-24 rounded-lg border border-slate-200 bg-white p-2 text-right font-mono text-xs font-bold outline-none focus:border-blue-500"
                                                        />
                                                    )}
                                                </td>
                                                <td className="p-3 text-right font-mono font-black text-emerald-700">{toMoney(importe)}</td>
                                                {!isReadOnly && (
                                                    <td className="p-3 text-center">
                                                        <button
                                                            type="button"
                                                            onClick={() => removeDetalle(index)}
                                                            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                                                            title="Eliminar producto"
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
                </section>
            </form>
        </div>
    );
}
