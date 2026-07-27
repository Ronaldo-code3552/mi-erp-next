"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
    IconArrowLeft,
    IconDeviceFloppy,
    IconFileInvoice,
    IconLoader,
    IconPackage,
    IconPlus,
    IconSearch,
    IconTrash,
    IconX
} from "@tabler/icons-react";

import SearchableSelect from "@/components/forms/SearchableSelect";
import DocumentoAdjuntosPanel from "@/components/documentos/DocumentoAdjuntosPanel";
import DocumentoCompraImportModal from "./DocumentoCompraImportModal";
import OrdenCompraImportModal from "./OrdenCompraImportModal";
import { documentoCompraService } from "@/services/documentoCompraService";
import { monedaService } from "@/services/monedaService";
import { presentacionService } from "@/services/presentacionService";
import { productoService } from "@/services/productoService";
import { proveedorService } from "@/services/proveedorService";
import { tipoPagoService } from "@/services/tipoPagoService";
import {
    DocumentoCompra,
    DocumentoCompraDetalle,
    DocumentoCompraPayload
} from "@/types/documentoCompra.types";
import { Moneda } from "@/types/moneda.types";
import { OrdenCompraServicio, OrdenCompraServicioDetalle } from "@/types/ordenCompraServicio.types";
import { Producto } from "@/types/producto.types";
import { Proveedor } from "@/types/proveedor.types";
import { TipoPago } from "@/types/tipoPago.types";
import {
    DOCUMENTO_PDF_REFERENCIAS,
    DocumentoPdfFormSubmitResult
} from "@/types/documentoPdf.types";

const EMPRESA_ID = "005";
const USER_ID = "CU0001";
const IGV_RATE = 0.18;
const CREDIT_DEBIT_NOTE_TYPE_IDS = new Set(["X067", "X068"]);
const LOCAL_PURCHASE = "COMPRA NACIONAL";
const IMPORTED_PURCHASE = "IMPORTACION";
const PURCHASE_TYPE_OPTIONS = [
    { value: LOCAL_PURCHASE, label: "Compra productos locales" },
    { value: IMPORTED_PURCHASE, label: "Compra productos Importados" }
];

type SelectOption = {
    key?: string | number;
    value: string | number;
    label?: string;
    aux?: string | number;
    raw?: unknown;
};

type DetalleDraft = {
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
    maximoExceso: string;
    bloqueado: boolean;
    origenImportado: boolean;
};

type FormValue = {
    documentoCompraId: string;
    ordenCompraServicioId: string;
    ordenNumero: string;
    documentoReferenciaId: string;
    documentoReferenciaNumero: string;
    tipoDocComercialId: string;
    serie: string;
    numero: string;
    fechaDoc: string;
    guiasRemisionId: string;
    proveedorId: string;
    monedaId: string;
    tipoPagoId: string;
    tipoCompra: string;
    tipoCambio: string;
    observacion: string;
    fotoDocumentoCompra: string;
    incluyeIgv: boolean;
    subtotalAfectoBase: string;
    subtotalExoneradoBase: string;
    maximoExceso: string;
    saldo: string;
    estado: string;
    detalles: DetalleDraft[];
};

interface Props {
    title: string;
    submitText: string;
    initialValue?: Partial<DocumentoCompra>;
    readOnly?: boolean;
    onBack: () => void;
    onSubmit: (
        payload: DocumentoCompraPayload,
        archivosPendientes: File[]
    ) => Promise<DocumentoPdfFormSubmitResult | void>;
}

const today = () => new Date().toISOString().slice(0, 10);
const numberOf = (value: unknown) => {
    const parsed = Number(value ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
};
const round = (value: number, decimals = 6) => Math.round((value + Number.EPSILON) * (10 ** decimals)) / (10 ** decimals);
const money = (value: number) => new Intl.NumberFormat("es-PE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value || 0);
const dateInput = (value: unknown) => {
    if (!value) return "";
    const parsed = new Date(String(value));
    return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString().slice(0, 10);
};

const first = (source: Record<string, unknown>, keys: string[]) => {
    for (const key of keys) {
        const value = source[key];
        if (value !== undefined && value !== null && String(value).trim() !== "") return String(value).trim();
    }
    return "";
};

const nested = (source: Record<string, unknown>, keys: string[]) => {
    for (const key of keys) {
        const value = source[key];
        if (value && typeof value === "object") return value as Record<string, unknown>;
    }
    return {};
};

const boolOf = (value: unknown, fallback = false) => {
    if (value === undefined || value === null || value === "") return fallback;
    if (typeof value === "boolean") return value;
    if (typeof value === "number") return value === 1;
    return ["1", "true", "si", "sí", "afecto"].includes(String(value).trim().toLowerCase());
};

const normalizePurchaseType = (value: unknown) => {
    const text = String(value || "").trim().toUpperCase();
    if (text.includes("IMPORT")) return IMPORTED_PURCHASE;
    return LOCAL_PURCHASE;
};

const usesDocumentReference = (documentTypeId: unknown) => (
    CREDIT_DEBIT_NOTE_TYPE_IDS.has(String(documentTypeId || "").trim().toUpperCase())
);

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
    const rate = numberOf(exchange?.tc_venta);
    return rate > 0 ? rate : 1;
};

const operationOf = (bien: Record<string, unknown>) => {
    const operation = nested(bien, ["operacionesItem", "operacionItem", "OperacionesItem", "OperacionItem"]);
    return {
        id: first(bien, ["operacionesItemId", "operacionesitemId", "operacionItemId", "OperacionesItemId"]) || first(operation, ["operacionesItemId", "operacionesitemId", "operacionItemId", "OperacionesItemId"]),
        label: first(operation, ["descripcion", "Descripcion"])
    };
};

const isAfecto = (detail: DetalleDraft) => detail.operacionItemId
    ? detail.operacionItemId === "1000"
    : detail.afectoInafecto;

const conversionTotalOf = (detail: DetalleDraft) => {
    if (detail.conversionTotalDesdeBackend) return round(numberOf(detail.conversionTotal));

    return round(numberOf(detail.cantidad) * detail.presentacionCantidad);
};

const importeOf = (detail: DetalleDraft) => round(numberOf(detail.cantidad) * numberOf(detail.costo));

const getValorVentaAfecto = (source: Record<string, unknown>) => first(source, [
    "valorVentaAfecto",
    "valorventaAfecto",
    "valorventa_afecto",
    "ValorVentaAfecto",
    "ValorventaAfecto",
    "subtotalAfecto",
    "SubtotalAfecto"
]);

const getValorVentaExonerado = (source: Record<string, unknown>) => first(source, [
    "valorVentaExonerado",
    "valorventaExonerado",
    "valorventa_exonerado",
    "ValorVentaExonerado",
    "ValorventaExonerado",
    "subtotalExonerado",
    "SubtotalExonerado"
]);

const normalizeDetails = (
    details: Array<DocumentoCompraDetalle | OrdenCompraServicioDetalle> = [],
    options: { bloqueado?: boolean; origenImportado?: boolean } = {}
): DetalleDraft[] => details.map(detail => {
    const raw = detail as Record<string, unknown>;
    const bien = nested(raw, ["bien", "Bien"]);
    const presentation = nested(raw, ["presentacion", "Presentacion"]);
    const operation = operationOf(bien);
    const cantidad = first(raw, ["cantidad", "Cantidad"]) || "0";
    const costo = first(raw, ["costo", "Costo"]) || "0";
    const hasImporte = ["importe", "Importe"].some(key => raw[key] !== undefined && raw[key] !== null);
    const importe = first(raw, ["importe", "Importe"]);
    const hasConversionTotal = ["conversionTotal", "conversion_total", "ConversionTotal"].some(key => raw[key] !== undefined && raw[key] !== null);
    const conversionTotal = first(raw, ["conversionTotal", "conversion_total", "ConversionTotal"]);
    const cantidadNumber = numberOf(cantidad);
    const conversionNumber = numberOf(conversionTotal);
    const presentationQuantity = numberOf(presentation.cantidad) || (cantidadNumber > 0 && hasConversionTotal ? conversionNumber / cantidadNumber : 0) || 1;

    return {
        bienId: first(raw, ["bienId", "BienId"]) || first(bien, ["bienId", "BienId"]),
        bienLabel: first(bien, ["descripcion", "Descripcion"]) || first(raw, ["bienDescripcion"]),
        bienCodigo: first(bien, ["codigo_existencia", "cod_admin"]),
        operacionItemId: operation.id,
        operacionItemLabel: operation.label,
        afectoInafecto: boolOf(raw.afectoInafecto ?? raw.afecto_inafecto ?? bien.afecto_inafecto, operation.id === "1000"),
        presentacionId: first(raw, ["presentacionId", "PresentacionId"]) || first(presentation, ["presentacionId"]),
        presentacionLabel: first(presentation, ["descripcion", "Descripcion"]),
        presentacionCantidad: presentationQuantity || 1,
        cantidad,
        costo,
        conversionTotal: hasConversionTotal ? conversionTotal : "",
        conversionTotalDesdeBackend: hasConversionTotal,
        importe,
        importeDesdeBackend: hasImporte,
        observacion: first(raw, ["observacion", "Observacion"]),
        maximoExceso: first(raw, ["maximoExceso", "maximo_exceso", "MaximoExceso"]) || "0",
        bloqueado: options.bloqueado ?? false,
        origenImportado: options.origenImportado ?? false
    };
});

const normalizeForm = (source?: Partial<DocumentoCompra>): FormValue => {
    const raw = (source || {}) as Record<string, unknown>;
    const order = nested(raw, ["ordenCompraServicio", "ordencompraServicio", "ordenCompra"]);
    const referenceValue = raw.documentoReferencia ?? raw.documento_referencia ?? raw.DocumentoReferencia;
    const reference = referenceValue && typeof referenceValue === "object"
        ? referenceValue as Record<string, unknown>
        : {};
    const purchaseType = first(raw, ["tipoCompra", "tipo_compra", "TipoCompra"]);
    const documentId = first(raw, ["documentocompraId", "documentoCompraId", "DocumentoCompraId"]);
    const orderId = first(raw, ["ordencompraservicioId", "ordenCompraServicioId", "OrdenCompraServicioId"]);
    const referenceId = Object.keys(reference).length
        ? first(reference, ["documentocompraId", "documentoCompraId", "DocumentoCompraId"])
        : String(referenceValue || "").trim();
    const referenceSerie = first(reference, ["serie", "Serie"]);
    const referenceNumero = first(reference, ["numero", "Numero"]);
    return {
        documentoCompraId: documentId,
        ordenCompraServicioId: orderId,
        ordenNumero: first(order, ["numero_ordencompra", "numeroOrdenCompra"]) || first(raw, ["numeroOrdenCompra"]),
        documentoReferenciaId: referenceId,
        documentoReferenciaNumero: [referenceSerie, referenceNumero].filter(Boolean).join("-") || referenceId,
        tipoDocComercialId: first(raw, ["tipodoccomercialId", "tipoDocComercialId", "TipoDocComercialId"]),
        serie: first(raw, ["serie", "Serie"]),
        numero: first(raw, ["numero", "Numero"]),
        fechaDoc: dateInput(first(raw, ["fechaDoc", "fecha_doc", "FechaDoc", "fechaEmision", "fecha_emision"])) || today(),
        guiasRemisionId: first(raw, ["guiasremisionId", "guiasRemisionId", "GuiasRemisionId"]),
        proveedorId: first(raw, ["proveedorId", "ProveedorId"]),
        monedaId: first(raw, ["monedaId", "MonedaId"]) || "001",
        tipoPagoId: first(raw, ["tipopagoId", "tipoPagoId", "TipoPagoId"]),
        tipoCompra: normalizePurchaseType(purchaseType),
        tipoCambio: first(raw, ["tipoCambio", "tipo_cambio", "TipoCambio"]) || "1",
        observacion: first(raw, ["observacion", "Observacion"]),
        fotoDocumentoCompra: first(raw, ["fotoDocumentocompra", "fotoDocumentoCompra", "foto_documentocompra"]),
        incluyeIgv: boolOf(raw.incluyeIgv ?? raw.incluye_igv ?? raw.IncluyeIgv, false),
        subtotalAfectoBase: documentId ? getValorVentaAfecto(raw) || "0" : "0",
        subtotalExoneradoBase: documentId ? getValorVentaExonerado(raw) || "0" : "0",
        maximoExceso: first(((source?.detalles || [])[0] || {}) as Record<string, unknown>, ["maximoExceso", "maximo_exceso", "MaximoExceso"]) || "0",
        saldo: first(raw, ["saldo", "Saldo"]),
        estado: first(raw, ["estado", "Estado"]) || "REGISTRADO",
        detalles: normalizeDetails((source?.detalles || []) as DocumentoCompraDetalle[], {
            bloqueado: Boolean(documentId),
            origenImportado: Boolean(orderId || referenceId)
        })
    };
};

const emptyDetail = (): DetalleDraft => ({
    bienId: "", bienLabel: "", bienCodigo: "", operacionItemId: "", operacionItemLabel: "",
    afectoInafecto: false, presentacionId: "", presentacionLabel: "", presentacionCantidad: 1,
    cantidad: "1", costo: "0", conversionTotal: "", conversionTotalDesdeBackend: false,
    importe: "", importeDesdeBackend: false, observacion: "", maximoExceso: "0",
    bloqueado: false, origenImportado: false
});

const Input = ({ label, disabled, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) => (
    <div className="flex min-w-0 flex-col gap-1.5">
        <label className="text-[10px] font-bold uppercase text-slate-500">{label}</label>
        <input disabled={disabled} className={`h-[38px] min-w-0 rounded-lg border p-2.5 text-xs outline-none focus:border-blue-500 ${disabled ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-500" : "border-slate-200 bg-white text-slate-800"}`} {...props} />
    </div>
);

export default function DocumentoCompraForm({
    title,
    submitText,
    initialValue,
    readOnly = false,
    onBack,
    onSubmit
}: Props) {
    const [form, setForm] = useState<FormValue>(() => normalizeForm(initialValue));
    const [addDetail, setAddDetail] = useState<DetalleDraft>(emptyDetail);
    const [presentationOptions, setPresentationOptions] = useState<SelectOption[]>([]);
    const [currencyOptions, setCurrencyOptions] = useState<SelectOption[]>([]);
    const [saving, setSaving] = useState(false);
    const [archivosPendientes, setArchivosPendientes] = useState<File[]>([]);
    const [adjuntosRefreshKey, setAdjuntosRefreshKey] = useState(0);
    const [orderModalOpen, setOrderModalOpen] = useState(false);
    const [documentModalOpen, setDocumentModalOpen] = useState(false);
    const [importedLabels, setImportedLabels] = useState({ provider: "", currency: "", payment: "" });
    const importsDocument = usesDocumentReference(form.tipoDocComercialId);
    const isEditing = Boolean(form.documentoCompraId);
    const isReadOnly = readOnly || form.estado.trim().toUpperCase() !== "REGISTRADO";
    const linkedSourceId = importsDocument ? form.documentoReferenciaId : form.ordenCompraServicioId;
    const igvLocked = isReadOnly || Boolean(linkedSourceId);

    useEffect(() => setForm(normalizeForm(initialValue)), [initialValue]);

    useEffect(() => {
        let mounted = true;

        const loadCurrencies = async () => {
            const response = await monedaService.getAll(1, 20);
            if (!mounted || !response.isSuccess) return;

            const currencies = response.data || [];
            setCurrencyOptions(currencies.map(currency => ({
                value: currencyIdOf(currency),
                label: currencyLabelOf(currency),
                aux: currencySymbolOf(currency),
                raw: currency
            })).filter(option => option.value));

            setForm(previous => {
                if (previous.documentoCompraId || previous.ordenCompraServicioId || previous.documentoReferenciaId) {
                    return previous;
                }

                const selectedCurrency = currencies.find(currency => currencyIdOf(currency) === previous.monedaId);
                return {
                    ...previous,
                    tipoCambio: String(currencyExchangeRateOf(selectedCurrency))
                };
            });
        };

        loadCurrencies();
        return () => { mounted = false; };
    }, []);

    const totals = useMemo(() => {
        let newAffectAmount = 0;
        let newExemptAmount = 0;
        form.detalles.forEach(detail => {
            if (detail.bloqueado || detail.origenImportado) return;

            const amount = importeOf(detail);
            if (isAfecto(detail)) newAffectAmount += amount;
            else newExemptAmount += amount;
        });

        const baseSubtotalAfecto = round(numberOf(form.subtotalAfectoBase));
        const baseSubtotalExonerado = round(numberOf(form.subtotalExoneradoBase));
        const newSubtotalAfecto = round(form.incluyeIgv ? newAffectAmount / (1 + IGV_RATE) : newAffectAmount);
        const newSubtotalExonerado = round(newExemptAmount);
        const subtotalAfecto = round(baseSubtotalAfecto + newSubtotalAfecto);
        const subtotalExonerado = round(baseSubtotalExonerado + newSubtotalExonerado);
        const igv = round(subtotalAfecto * IGV_RATE);

        return { subtotalAfecto, subtotalExonerado, igv, total: round(subtotalAfecto + subtotalExonerado + igv) };
    }, [form.detalles, form.incluyeIgv, form.subtotalAfectoBase, form.subtotalExoneradoBase]);

    const labels = useMemo(() => {
        const raw = (initialValue || {}) as Record<string, unknown>;
        const selectedCurrency = currencyOptions.find(option => String(option.value) === form.monedaId);
        return {
            provider: importedLabels.provider || first(nested(raw, ["proveedor", "Proveedor"]), ["descripcion"]) || form.proveedorId,
            currency: importedLabels.currency || first(nested(raw, ["moneda", "Moneda"]), ["descripcion", "abreviatura"]) || selectedCurrency?.label || (form.monedaId ? "Cargando moneda..." : ""),
            payment: importedLabels.payment || first(nested(raw, ["tipoPago", "TipoPago"]), ["descripcion"]) || form.tipoPagoId,
            documentType: first(nested(raw, ["tipoDocumentoComercial", "tipoDocumento"]), ["descripcion"]) || form.tipoDocComercialId,
            order: form.ordenNumero || form.ordenCompraServicioId,
            reference: form.documentoReferenciaNumero || form.documentoReferenciaId
        };
    }, [currencyOptions, form.documentoReferenciaId, form.documentoReferenciaNumero, form.monedaId, form.ordenCompraServicioId, form.ordenNumero, form.proveedorId, form.tipoDocComercialId, form.tipoPagoId, importedLabels, initialValue]);

    const selectedCurrency = currencyOptions.find(option => String(option.value) === form.monedaId)?.raw as Moneda | undefined;
    const currencySymbol = currencySymbolOf(selectedCurrency)
        || first(nested((initialValue || {}) as Record<string, unknown>, ["moneda", "Moneda"]), ["simbolomoneda", "simbolo", "abreviatura"]);

    const setField = (name: keyof FormValue, value: string | boolean) => setForm(previous => ({ ...previous, [name]: value }));
    const exchangeRateByCurrencyId = (currencyId: string) => {
        const currency = currencyOptions.find(option => String(option.value) === currencyId)?.raw as Moneda | undefined;
        return String(currencyExchangeRateOf(currency));
    };

    const handleCurrencyChange = (currencyId: string, option?: SelectOption) => {
        const currency = option?.raw as Moneda | undefined;
        setForm(previous => ({
            ...previous,
            monedaId: currencyId,
            tipoCambio: String(currencyExchangeRateOf(currency))
        }));
    };

    const fetchDocumentTypes = async (term: string): Promise<SelectOption[]> => {
        const response = await documentoCompraService.getTiposDocumento("DOCUMENTO_COMPRA");
        const normalizedTerm = term.trim().toLowerCase();
        return (response.data || []).filter(item => !normalizedTerm || `${item.descripcion} ${item.abreviatura || ""}`.toLowerCase().includes(normalizedTerm)).map(item => ({
            key: item.tipodoccomercialId, value: item.tipodoccomercialId, label: item.descripcion, aux: item.abreviatura, raw: item
        }));
    };

    const handleDocumentTypeChange = (documentTypeId: string) => {
        const changesImportSource = importsDocument !== usesDocumentReference(documentTypeId);
        const hasImportedSource = Boolean(form.ordenCompraServicioId || form.documentoReferenciaId);

        setOrderModalOpen(false);
        setDocumentModalOpen(false);

        if (!changesImportSource || !hasImportedSource) {
            setField("tipoDocComercialId", documentTypeId);
            return;
        }

        setImportedLabels({ provider: "", currency: "", payment: "" });
        setForm(previous => ({
            ...previous,
            tipoDocComercialId: documentTypeId,
            ordenCompraServicioId: "",
            ordenNumero: "",
            documentoReferenciaId: "",
            documentoReferenciaNumero: "",
            proveedorId: "",
            monedaId: "001",
            tipoPagoId: "",
            tipoCambio: exchangeRateByCurrencyId("001"),
            subtotalAfectoBase: "0",
            subtotalExoneradoBase: "0",
            detalles: previous.detalles.filter(detail => !detail.origenImportado)
        }));
        toast.info("Se limpió la importación porque cambió el tipo de documento.");
    };

    const handleOrderImported = (order: OrdenCompraServicio) => {
        const raw = order as Record<string, unknown>;
        const id = first(raw, ["ordencompraservicioId", "ordenCompraServicioId", "OrdenCompraServicioId"]);
        const status = first(raw, ["estado", "Estado"]).toUpperCase();
        if (!id) return toast.error("La orden seleccionada no tiene un ID válido.");
        if (!status.includes("APROB")) return toast.error("Solo se pueden importar órdenes aprobadas.");

        const provider = nested(raw, ["proveedor", "Proveedor"]);
        const currency = nested(raw, ["moneda", "Moneda"]);
        const payment = nested(raw, ["tipoPago", "TipoPago"]);
        const currencyId = first(raw, ["monedaId", "MonedaId"]) || first(currency, ["monedaId"]);
        const details = normalizeDetails((order.detalles || order.Detalles || []) as OrdenCompraServicioDetalle[], {
            bloqueado: true,
            origenImportado: true
        });
        if (!details.length) return toast.warning("La orden seleccionada no contiene productos.");

        setImportedLabels({
            provider: first(provider, ["descripcion", "Descripcion"]),
            currency: first(currency, ["descripcion", "abreviatura", "simbolomoneda"]),
            payment: first(payment, ["descripcion", "Descripcion"])
        });
        setForm(previous => ({
            ...previous,
            ordenCompraServicioId: id,
            ordenNumero: first(raw, ["numero_ordencompra", "numeroOrdenCompra", "NumeroOrdenCompra"]) || id,
            proveedorId: first(raw, ["proveedorId", "ProveedorId"]) || first(provider, ["proveedorId"]),
            monedaId: currencyId,
            tipoPagoId: first(raw, ["tipopagoId", "tipoPagoId", "TipoPagoId"]) || first(payment, ["tipopagoId"]),
            tipoCambio: first(raw, ["tipo_cambio", "tipoCambio", "TipoCambio"]) || exchangeRateByCurrencyId(currencyId),
            incluyeIgv: boolOf(raw.incluye_igv ?? raw.incluyeIgv, previous.incluyeIgv),
            subtotalAfectoBase: getValorVentaAfecto(raw) || "0",
            subtotalExoneradoBase: getValorVentaExonerado(raw) || "0",
            detalles: details
        }));
        setOrderModalOpen(false);
        toast.success(`Orden ${first(raw, ["numero_ordencompra", "numeroOrdenCompra"]) || id} importada.`);
    };

    const clearImportedOrder = () => {
        setImportedLabels({ provider: "", currency: "", payment: "" });
        setForm(previous => ({
            ...previous,
            ordenCompraServicioId: "",
            ordenNumero: "",
            proveedorId: "",
            monedaId: "001",
            tipoPagoId: "",
            tipoCambio: exchangeRateByCurrencyId("001"),
            subtotalAfectoBase: "0",
            subtotalExoneradoBase: "0",
            detalles: previous.detalles.filter(detail => !detail.origenImportado)
        }));
        setOrderModalOpen(false);
        toast.success("Importación de orden limpiada.");
    };

    const handleDocumentImported = (document: DocumentoCompra) => {
        const raw = document as Record<string, unknown>;
        const id = first(raw, ["documentocompraId", "documentoCompraId", "DocumentoCompraId"]);
        const documentTypeId = first(raw, ["tipodoccomercialId", "tipoDocComercialId", "TipoDocComercialId"]);
        const status = first(raw, ["estado", "Estado"]).toUpperCase();
        if (!id) return toast.error("El documento seleccionado no tiene un ID válido.");
        if (documentTypeId !== "X062") return toast.error("Solo se pueden importar facturas de compra.");
        if (status.includes("ANUL")) return toast.error("No se puede importar un documento anulado.");

        const provider = nested(raw, ["proveedor", "Proveedor"]);
        const currency = nested(raw, ["moneda", "Moneda"]);
        const payment = nested(raw, ["tipoPago", "TipoPago"]);
        const currencyId = first(raw, ["monedaId", "MonedaId"]) || first(currency, ["monedaId"]);
        const details = normalizeDetails((document.detalles || []) as DocumentoCompraDetalle[], {
            bloqueado: true,
            origenImportado: true
        });
        if (!details.length) return toast.warning("El documento seleccionado no contiene productos.");

        const serie = first(raw, ["serie", "Serie"]);
        const numero = first(raw, ["numero", "Numero"]);
        const displayNumber = [serie, numero].filter(Boolean).join("-") || id;

        setImportedLabels({
            provider: first(provider, ["descripcion", "Descripcion"]),
            currency: first(currency, ["descripcion", "abreviatura", "simbolomoneda"]),
            payment: first(payment, ["descripcion", "Descripcion"])
        });
        setForm(previous => ({
            ...previous,
            ordenCompraServicioId: "",
            ordenNumero: "",
            documentoReferenciaId: id,
            documentoReferenciaNumero: displayNumber,
            proveedorId: first(raw, ["proveedorId", "ProveedorId"]) || first(provider, ["proveedorId"]),
            monedaId: currencyId,
            tipoPagoId: first(raw, ["tipopagoId", "tipoPagoId", "TipoPagoId"]) || first(payment, ["tipopagoId"]),
            tipoCompra: normalizePurchaseType(first(raw, ["tipoCompra", "tipo_compra", "TipoCompra"]) || previous.tipoCompra),
            tipoCambio: first(raw, ["tipo_cambio", "tipoCambio", "TipoCambio"]) || exchangeRateByCurrencyId(currencyId),
            incluyeIgv: boolOf(raw.incluye_igv ?? raw.incluyeIgv, previous.incluyeIgv),
            subtotalAfectoBase: getValorVentaAfecto(raw) || "0",
            subtotalExoneradoBase: getValorVentaExonerado(raw) || "0",
            detalles: details
        }));
        setDocumentModalOpen(false);
        toast.success(`Documento ${displayNumber} importado.`);
    };

    const clearImportedDocument = () => {
        setImportedLabels({ provider: "", currency: "", payment: "" });
        setForm(previous => ({
            ...previous,
            documentoReferenciaId: "",
            documentoReferenciaNumero: "",
            proveedorId: "",
            monedaId: "001",
            tipoPagoId: "",
            tipoCambio: exchangeRateByCurrencyId("001"),
            subtotalAfectoBase: "0",
            subtotalExoneradoBase: "0",
            detalles: previous.detalles.filter(detail => !detail.origenImportado)
        }));
        setDocumentModalOpen(false);
        toast.success("Importación de documento limpiada.");
    };

    const fetchProviderOptions = async (term: string): Promise<SelectOption[]> => {
        const response = await proveedorService.getAll(1, 20, term, { estado: [1] });
        return (response.data || []).map((item: Proveedor) => ({
            value: item.proveedorId || item.ProveedorId || "", label: item.descripcion || item.Descripcion || "", aux: item.numero_doc || item.numeroDoc, raw: item
        })).filter(item => item.value);
    };

    const fetchPaymentOptions = async (term: string): Promise<SelectOption[]> => {
        const response = await tipoPagoService.getAll(1, 20, term, { FiltroEstado: true });
        return (response.data || []).map((item: TipoPago) => ({ value: item.tipopagoId || item.tipoPagoId || "", label: item.descripcion || item.Descripcion || "", raw: item })).filter(item => item.value);
    };

    const fetchProductOptions = async (term: string): Promise<SelectOption[]> => {
        const response = await productoService.getByEmpresa(EMPRESA_ID, 1, 20, term, null, true);
        return (response.data || []).map((item: Producto) => ({ value: item.bienId, label: item.descripcion, aux: item.codigo_existencia, raw: item }));
    };

    const handleProduct = async (option?: SelectOption) => {
        const product = option?.raw as Producto | undefined;
        if (!product) return;
        const operation = operationOf(product as unknown as Record<string, unknown>);
        setAddDetail(previous => ({
            ...previous,
            bienId: product.bienId,
            bienLabel: product.descripcion,
            bienCodigo: product.codigo_existencia || String(product.cod_admin || ""),
            operacionItemId: operation.id,
            operacionItemLabel: operation.label,
            afectoInafecto: boolOf(product.afecto_inafecto, operation.id === "1000"),
            presentacionId: "",
            presentacionLabel: "",
            presentacionCantidad: 1,
            costo: String(product.costo || 0),
            conversionTotal: "",
            conversionTotalDesdeBackend: false,
            importe: "",
            importeDesdeBackend: false
        }));
        const embedded = (product.presentaciones || []).filter(item => item.estado !== false);
        if (embedded.length) {
            setPresentationOptions(embedded.map(item => ({ value: item.presentacionId, label: item.descripcion, aux: item.cantidad, raw: item })));
            return;
        }
        const response = await presentacionService.getByBien(product.bienId, true);
        setPresentationOptions((response.data || []).map(item => ({ value: item.presentacionId || "", label: item.descripcion, aux: item.cantidad, raw: item })).filter(item => item.value));
    };

    const addProduct = () => {
        if (!addDetail.bienId || !addDetail.presentacionId) return toast.warning("Seleccione producto y presentación.");
        if (numberOf(addDetail.cantidad) <= 0) return toast.warning("La cantidad debe ser mayor a cero.");
        if (form.detalles.some(item => item.bienId === addDetail.bienId && item.presentacionId === addDetail.presentacionId)) return toast.warning("El producto y presentación ya fueron agregados.");
        setForm(previous => ({ ...previous, detalles: [...previous.detalles, addDetail] }));
        setAddDetail(emptyDetail());
        setPresentationOptions([]);
    };

    const updateDetail = (index: number, field: "cantidad" | "costo", value: string) => setForm(previous => ({
        ...previous,
        detalles: previous.detalles.map((item, detailIndex) => detailIndex === index && !item.bloqueado ? {
            ...item,
            [field]: value,
            conversionTotal: field === "cantidad" ? "" : item.conversionTotal,
            conversionTotalDesdeBackend: field === "cantidad" ? false : item.conversionTotalDesdeBackend,
            importe: "",
            importeDesdeBackend: false
        } : item)
    }));

    const validate = () => {
        if (!form.tipoDocComercialId || !form.serie.trim() || !form.numero.trim()) return "Complete tipo de documento, serie y número.";
        if (importsDocument && !form.documentoReferenciaId) return "Importe la factura de compra que será referenciada.";
        if (!form.fechaDoc || !form.proveedorId || !form.monedaId || !form.tipoPagoId) return "Complete fecha, proveedor, moneda y tipo de pago.";
        if (numberOf(form.tipoCambio) <= 0) return "El tipo de cambio debe ser mayor a cero.";
        if (!form.detalles.length) return "Agregue al menos un producto.";
        return "";
    };

    const submit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (isReadOnly || saving) return;
        const error = validate();
        if (error) return toast.warning(error);
        const payload: DocumentoCompraPayload = {
            ordenCompraServicioId: importsDocument ? null : form.ordenCompraServicioId || null,
            tipoDocComercialId: form.tipoDocComercialId,
            serie: form.serie.trim().toUpperCase(),
            numero: form.numero.trim(),
            fechaEmision: form.fechaDoc,
            fechaDoc: form.fechaDoc,
            guiasRemisionId: form.guiasRemisionId.trim() || null,
            proveedorId: form.proveedorId,
            monedaId: form.monedaId,
            valorVentaAfecto: totals.subtotalAfecto,
            valorVentaExonerado: totals.subtotalExonerado,
            igv: totals.igv,
            total: totals.total,
            saldo: isEditing && form.saldo !== "" ? Math.min(numberOf(form.saldo), totals.total) : totals.total,
            observacion: form.observacion.trim() || null,
            tipoPagoId: form.tipoPagoId,
            detraccion: false,
            fotoDocumentoCompra: isEditing ? form.fotoDocumentoCompra || null : null,
            cuentaUsuarioId: USER_ID,
            tipoCompra: normalizePurchaseType(form.tipoCompra),
            documentoReferencia: importsDocument ? form.documentoReferenciaId : null,
            motivoElectronicoId: null,
            incluyeIgv: form.incluyeIgv,
            tipoCambio: numberOf(form.tipoCambio),
            igvPorcentaje: IGV_RATE,
            detalles: form.detalles.map((detail, index) => ({
                bienId: detail.bienId,
                presentacionId: detail.presentacionId,
                item: index + 1,
                cantidad: round(numberOf(detail.cantidad)),
                costo: round(numberOf(detail.costo)),
                conversionTotal: round(conversionTotalOf(detail)),
                importe: importeOf(detail),
                descuentoProducto: 0,
                observacion: detail.observacion.trim() || null,
                maximoExceso: Math.max(0, Math.trunc(numberOf(form.maximoExceso)))
            }))
        };
        setSaving(true);
        try {
            const result = await onSubmit(payload, archivosPendientes);
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

    return (
        <div className="min-h-full bg-slate-50 p-4 lg:p-6">
            <form onSubmit={submit} className="mx-auto max-w-[1500px] space-y-5">
                <div className="flex items-center justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                        <button type="button" onClick={onBack} className="rounded-lg border border-slate-200 bg-white p-2 text-slate-500 hover:text-blue-600" title="Volver"><IconArrowLeft size={18} /></button>
                        <div className="min-w-0"><h1 className="truncate text-xl font-bold text-slate-800">{title}</h1><p className="text-xs text-slate-500">{importsDocument ? "Nota de crédito/débito y detalle de productos." : "Documento de compra y detalle de productos."}</p></div>
                    </div>
                    {!isReadOnly && <button type="submit" disabled={saving} className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60">{saving ? <IconLoader className="animate-spin" size={17} /> : <IconDeviceFloppy size={17} />}{submitText}</button>}
                </div>

                <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                    <div className="flex items-center gap-2 border-b border-sky-100 bg-sky-50 px-4 py-3"><IconFileInvoice size={18} className="text-sky-700" /><h2 className="text-sm font-black uppercase text-sky-800">Datos del documento</h2></div>
                    <div className="grid grid-cols-1 gap-5 p-5 xl:grid-cols-[1fr_260px]">
                        <div className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                            <SearchableSelect label="Tipo Doc" value={form.tipoDocComercialId} fetchCustom={fetchDocumentTypes} fallbackLabel={labels.documentType} disabled={isReadOnly || (isEditing && Boolean(linkedSourceId))} onChange={event => handleDocumentTypeChange(String(event.target.value))} />
                            <div className="flex flex-col gap-1.5"><label className="text-[10px] font-bold uppercase text-slate-500">Tipo Compra</label><select value={normalizePurchaseType(form.tipoCompra)} disabled={isReadOnly || (importsDocument && Boolean(linkedSourceId))} onChange={event => setField("tipoCompra", event.target.value)} className="h-[38px] rounded-lg border border-slate-200 bg-white px-2 text-xs disabled:bg-slate-100">{PURCHASE_TYPE_OPTIONS.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div>
                            <Input label="Serie" value={form.serie} maxLength={10} disabled={isReadOnly} onChange={event => setField("serie", event.target.value)} />
                            <Input label="Número" value={form.numero} maxLength={20} disabled={isReadOnly} onChange={event => setField("numero", event.target.value)} />
                            <Input label="Fecha Documento" type="date" value={form.fechaDoc} disabled={isReadOnly} onChange={event => setField("fechaDoc", event.target.value)} />
                            {importsDocument ? (
                                <div className="flex min-w-0 flex-col gap-1.5 lg:col-span-2">
                                    <label className="text-[10px] font-bold uppercase text-slate-500">Factura de compra referenciada</label>
                                    <div className="flex h-[38px] min-w-0 gap-2">
                                        <input value={labels.reference} readOnly placeholder="Sin documento importado" className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-100 px-3 font-mono text-xs font-bold text-slate-600 outline-none" />
                                        {!isReadOnly && !isEditing && form.documentoReferenciaId && <button type="button" onClick={clearImportedDocument} className="inline-flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100" title="Limpiar documento importado"><IconX size={17} /></button>}
                                        {!isReadOnly && <button type="button" onClick={() => setDocumentModalOpen(true)} disabled={Boolean(form.documentoReferenciaId)} className="inline-flex h-[38px] shrink-0 items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 text-xs font-bold text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-45"><IconSearch size={16} /> Cargar documento</button>}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex min-w-0 flex-col gap-1.5 lg:col-span-2">
                                    <label className="text-[10px] font-bold uppercase text-slate-500">N° Orden aprobada</label>
                                    <div className="flex h-[38px] min-w-0 gap-2">
                                        <input value={labels.order} readOnly placeholder="Sin orden importada" className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-100 px-3 font-mono text-xs font-bold text-slate-600 outline-none" />
                                        {!isReadOnly && !isEditing && form.ordenCompraServicioId && <button type="button" onClick={clearImportedOrder} className="inline-flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100" title="Limpiar orden importada"><IconX size={17} /></button>}
                                        {!isReadOnly && <button type="button" onClick={() => setOrderModalOpen(true)} disabled={Boolean(form.ordenCompraServicioId)} className="inline-flex h-[38px] shrink-0 items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 text-xs font-bold text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-45"><IconSearch size={16} /> Cargar orden</button>}
                                    </div>
                                </div>
                            )}
                            <Input label="N° Guía" value={form.guiasRemisionId} maxLength={12} disabled={isReadOnly} onChange={event => setField("guiasRemisionId", event.target.value)} />
                            <SearchableSelect label="Proveedor" value={form.proveedorId} fetchCustom={fetchProviderOptions} fallbackLabel={labels.provider} disabled={isReadOnly || Boolean(linkedSourceId)} onChange={event => setField("proveedorId", String(event.target.value))} />
                            <SearchableSelect label="Moneda" value={form.monedaId} options={currencyOptions} fallbackLabel={labels.currency} disabled={isReadOnly || Boolean(linkedSourceId)} onChange={event => handleCurrencyChange(String(event.target.value), event.option)} />
                            <SearchableSelect label="Tipo Pago" value={form.tipoPagoId} fetchCustom={fetchPaymentOptions} fallbackLabel={labels.payment} disabled={isReadOnly || Boolean(linkedSourceId)} onChange={event => setField("tipoPagoId", String(event.target.value))} />
                            <Input label="Observaciones" value={form.observacion} maxLength={250} disabled={isReadOnly} onChange={event => setField("observacion", event.target.value)} />
                            <DocumentoAdjuntosPanel
                                compact
                                referenciaId={form.documentoCompraId || undefined}
                                referenciaTabla={DOCUMENTO_PDF_REFERENCIAS.DOCUMENTO_COMPRA}
                                readOnly={isReadOnly}
                                disabled={saving}
                                refreshKey={adjuntosRefreshKey}
                                archivosPendientes={archivosPendientes}
                                onArchivosPendientesChange={setArchivosPendientes}
                            />
                            <div className="flex flex-col gap-1.5"><label className="text-[10px] font-bold uppercase text-red-500">¿Incluye IGV?</label><div className={`flex h-[38px] items-center gap-5 rounded-lg border border-slate-200 px-3 text-xs font-bold ${igvLocked ? "bg-slate-100 text-slate-500" : ""}`}><label className="flex gap-2"><input type="radio" checked={form.incluyeIgv} disabled={igvLocked} onChange={() => setField("incluyeIgv", true)} />Sí</label><label className="flex gap-2"><input type="radio" checked={!form.incluyeIgv} disabled={igvLocked} onChange={() => setField("incluyeIgv", false)} />No</label></div></div>
                            <Input label="Máximo Exceso" type="number" min="0" step="1" value={form.maximoExceso} disabled={isReadOnly} onChange={event => setField("maximoExceso", event.target.value)} />
                        </div>
                        <aside className="space-y-4">
                            <Input label="Tipo Cambio" type="text" value={[currencySymbol, form.tipoCambio].filter(Boolean).join(" ")} disabled />
                            <div className="space-y-4 rounded-lg border border-blue-200 bg-blue-50/40 p-4 text-sm">
                                <div><p className="text-xs font-black uppercase">Subtotal (Afecto)</p><p className="mt-1 text-lg font-black">{currencySymbol} {money(totals.subtotalAfecto)}</p></div>
                                <div><p className="text-xs font-black uppercase">Subtotal (Exonerado)</p><p className="mt-1 text-lg font-black">{currencySymbol} {money(totals.subtotalExonerado)}</p></div>
                                <div><p className="text-xs font-black uppercase">IGV</p><p className="mt-1 text-lg font-black">{currencySymbol} {money(totals.igv)}</p></div>
                                <div><p className="text-xs font-black uppercase">Total</p><p className="mt-1 text-xl font-black text-blue-700">{currencySymbol} {money(totals.total)}</p></div>
                            </div>
                        </aside>
                    </div>
                </section>

                <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-2"><div className="flex items-center gap-2"><IconPackage size={19} className="text-blue-600" /><h2 className="text-sm font-bold uppercase">Detalle de productos</h2></div><span className="text-xs font-bold text-slate-400">{form.detalles.length} producto(s)</span></div>
                    <div className="overflow-auto"><table className="w-full min-w-[980px] text-left text-xs"><thead className="bg-slate-50 uppercase text-slate-500"><tr><th className="p-3">#</th><th className="w-[36%] p-3">Producto</th><th className="p-3">Presentación</th><th className="p-3 text-right">Cantidad</th><th className="p-3 text-right">Costo</th><th className="p-3 text-right">Total</th>{!isReadOnly && <th className="p-3 text-center">Acc.</th>}</tr></thead>
                        <tbody className="divide-y divide-slate-100">
                            {!isReadOnly && (
                                <tr className="align-top">
                                    <td className="p-3 text-center">+</td>
                                    <td className="p-3">
                                        <SearchableSelect
                                            value={addDetail.bienId}
                                            fetchCustom={fetchProductOptions}
                                            fallbackLabel={addDetail.bienLabel}
                                            placeholder="Buscar producto"
                                            onChange={event => handleProduct(event.option as SelectOption)}
                                        />
                                        {addDetail.operacionItemLabel && (
                                            <span className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${isAfecto(addDetail) ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"}`}>
                                                {addDetail.operacionItemLabel}
                                            </span>
                                        )}
                                    </td>
                                    <td className="p-3">
                                        <SearchableSelect
                                            value={addDetail.presentacionId}
                                            options={presentationOptions}
                                            disabled={!addDetail.bienId}
                                            onChange={event => {
                                                const option = presentationOptions.find(item => String(item.value) === String(event.target.value));
                                                setAddDetail(previous => ({
                                                    ...previous,
                                                    presentacionId: String(event.target.value),
                                                    presentacionLabel: String(option?.label || ""),
                                                    presentacionCantidad: numberOf(option?.aux) || 1,
                                                    conversionTotal: "",
                                                    conversionTotalDesdeBackend: false,
                                                    importe: "",
                                                    importeDesdeBackend: false
                                                }));
                                            }}
                                        />
                                        <p className="mt-1 text-right font-mono text-[10px] font-bold text-slate-400">
                                            Conv. Total: {money(conversionTotalOf(addDetail))}
                                        </p>
                                    </td>
                                    <td className="p-3">
                                        <input
                                            type="number"
                                            min="0.01"
                                            step="0.01"
                                            value={addDetail.cantidad}
                                            onChange={event => setAddDetail(previous => ({ ...previous, cantidad: event.target.value }))}
                                            className="h-[38px] w-full rounded-lg border border-slate-200 p-2 text-right"
                                        />
                                    </td>
                                    <td className="p-3">
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={addDetail.costo}
                                            onChange={event => setAddDetail(previous => ({ ...previous, costo: event.target.value }))}
                                            className="h-[38px] w-full rounded-lg border border-slate-200 p-2 text-right"
                                        />
                                    </td>
                                    <td className="p-3 text-right font-mono font-bold text-emerald-700">{money(importeOf(addDetail))}</td>
                                    <td className="p-3 text-center">
                                        <button type="button" onClick={addProduct} className="inline-flex h-[38px] w-[38px] items-center justify-center rounded-lg bg-blue-50 text-blue-700" title="Agregar producto">
                                            <IconPlus size={17} />
                                        </button>
                                    </td>
                                </tr>
                            )}
                            {form.detalles.length === 0 ? (
                                <tr><td colSpan={isReadOnly ? 6 : 7} className="p-10 text-center italic text-slate-400">No hay productos en el documento.</td></tr>
                            ) : form.detalles.map((detail, index) => {
                                const rowLocked = isReadOnly || detail.bloqueado;

                                return (
                                    <tr key={`${detail.bienId}-${detail.presentacionId}-${index}`}>
                                        <td className="p-3 text-center text-slate-400">{index + 1}</td>
                                        <td className="p-3">
                                            <p className="font-bold text-slate-700">{detail.bienLabel || detail.bienId}</p>
                                            {detail.operacionItemLabel && (
                                                <span className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${isAfecto(detail) ? "bg-blue-50 text-blue-700" : "bg-amber-50 text-amber-700"}`}>
                                                    {detail.operacionItemLabel}
                                                </span>
                                            )}
                                            {detail.bloqueado && (
                                                <span className="ml-1 mt-1 inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-slate-500">
                                                    {detail.origenImportado ? "Importado" : "Guardado"}
                                                </span>
                                            )}
                                        </td>
                                        <td className="p-3 font-semibold">
                                            <span>{detail.presentacionLabel || detail.presentacionId}</span>
                                            <p className="mt-1 font-mono text-[10px] font-bold text-slate-400">
                                                Conv. Total: {money(conversionTotalOf(detail))}
                                            </p>
                                        </td>
                                        <td className="p-3 text-right">
                                            {rowLocked ? (
                                                <span className="font-mono font-bold text-slate-700">{money(numberOf(detail.cantidad))}</span>
                                            ) : (
                                                <input
                                                    type="number"
                                                    min="0.01"
                                                    step="0.01"
                                                    value={detail.cantidad}
                                                    onChange={event => updateDetail(index, "cantidad", event.target.value)}
                                                    className="h-[34px] w-24 rounded-lg border border-slate-200 p-2 text-right"
                                                />
                                            )}
                                        </td>
                                        <td className="p-3 text-right">
                                            {rowLocked ? (
                                                <span className="font-mono font-bold text-slate-700">{money(numberOf(detail.costo))}</span>
                                            ) : (
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={detail.costo}
                                                    onChange={event => updateDetail(index, "costo", event.target.value)}
                                                    className="h-[34px] w-24 rounded-lg border border-slate-200 p-2 text-right"
                                                />
                                            )}
                                        </td>
                                        <td className="p-3 text-right font-mono font-black text-emerald-700">{money(importeOf(detail))}</td>
                                        {!isReadOnly && (
                                            <td className="p-3 text-center">
                                                <button
                                                    type="button"
                                                    onClick={() => setForm(previous => ({
                                                        ...previous,
                                                        detalles: previous.detalles.filter((item, detailIndex) => item.bloqueado || detailIndex !== index)
                                                    }))}
                                                    disabled={detail.bloqueado}
                                                    className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-30"
                                                    title={detail.bloqueado ? "Este producto no se puede modificar" : "Quitar producto"}
                                                >
                                                    <IconTrash size={17} />
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                );
                            })}
                        </tbody></table></div>
                </section>
            </form>
            {!importsDocument && <OrdenCompraImportModal isOpen={orderModalOpen} onClose={() => setOrderModalOpen(false)} onImport={handleOrderImported} />}
            {importsDocument && <DocumentoCompraImportModal isOpen={documentModalOpen} onClose={() => setDocumentModalOpen(false)} onImport={handleDocumentImported} />}
        </div>
    );
}
