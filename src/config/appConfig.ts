const textValue = (value: string | undefined, fallback: string) => {
    const normalized = String(value || "").trim();
    return normalized || fallback;
};

const positiveIntegerValue = (value: string | undefined, fallback: number) => {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

export const EMPRESA_ID = textValue(
    process.env.NEXT_PUBLIC_EMPRESA_ID,
    "005"
);

export const ALMACEN_ID = textValue(
    process.env.NEXT_PUBLIC_ALMACEN_ID,
    "001"
);

export const CUENTA_USUARIO_ID = textValue(
    process.env.NEXT_PUBLIC_CUENTA_USUARIO_ID,
    "CU0001"
);

// Alias temporal para conservar el nombre usado actualmente en formularios y servicios.
export const USER_ID = CUENTA_USUARIO_ID;

export const USUARIO_NOMBRE = textValue(
    process.env.NEXT_PUBLIC_USUARIO_NOMBRE,
    "BIOSNET"
);

export const TENANT_ID = positiveIntegerValue(
    process.env.NEXT_PUBLIC_TENANT_ID,
    1
);

export const TENANT_ID_TEXT = String(TENANT_ID);

export const MONEDA_ID_DEFAULT = textValue(
    process.env.NEXT_PUBLIC_MONEDA_ID_DEFAULT,
    "001"
);

export const CURRENCY_IDS = {
    SOLES: "001",
    DOLARES: "002",
    EUROS: "003"
} as const;

export const EMPRESA_RUC = textValue(
    process.env.NEXT_PUBLIC_EMPRESA_RUC,
    "20100100100"
);

export const TIPO_CAMBIO_DEFAULT = 1;
export const IGV_RATE = 0.18;

export const DOCUMENT_TYPE_IDS = {
    FACTURA: "X062",
    NOTA_CREDITO: "X067",
    NOTA_DEBITO: "X068"
} as const;

export const PURCHASE_TYPES = {
    LOCAL: "COMPRA NACIONAL",
    IMPORTED: "IMPORTACION"
} as const;

export const DOCUMENT_STATES = {
    REGISTRADO: "REGISTRADO",
    PENDIENTE: "PENDIENTE",
    APROBADO: "APROBADO",
    COMPROMETIDO: "COMPROMETIDO",
    ANULADO: "ANULADO"
} as const;

type StringOption = {
    value: string;
    label: string;
};

const stateOptions = (states: string[]): StringOption[] => (
    states.map(state => ({ value: state, label: state }))
);

export const ORDEN_COMPRA_ESTADOS = [
    DOCUMENT_STATES.REGISTRADO,
    DOCUMENT_STATES.PENDIENTE,
    DOCUMENT_STATES.APROBADO,
    DOCUMENT_STATES.COMPROMETIDO,
    DOCUMENT_STATES.ANULADO
];

export const ORDEN_COMPRA_ESTADO_OPTIONS = stateOptions(
    ORDEN_COMPRA_ESTADOS
);

export const DOCUMENTO_COMPRA_ESTADOS = [
    DOCUMENT_STATES.REGISTRADO,
    DOCUMENT_STATES.COMPROMETIDO,
    DOCUMENT_STATES.ANULADO
];

export const DOCUMENTO_COMPRA_ESTADO_OPTIONS = stateOptions(
    DOCUMENTO_COMPRA_ESTADOS
);

export const NOTA_INGRESO_ESTADO_OPTIONS = stateOptions([
    DOCUMENT_STATES.REGISTRADO,
    DOCUMENT_STATES.APROBADO,
    DOCUMENT_STATES.ANULADO,
    DOCUMENT_STATES.COMPROMETIDO
]);

export const NOTA_SALIDA_ESTADO_OPTIONS = stateOptions([
    DOCUMENT_STATES.REGISTRADO,
    DOCUMENT_STATES.PENDIENTE,
    DOCUMENT_STATES.COMPROMETIDO,
    DOCUMENT_STATES.ANULADO
]);

export const PROVEEDOR_ESTADO_OPTIONS = [
    { value: 1, label: "ACTIVO" },
    { value: 0, label: DOCUMENT_STATES.ANULADO }
];

export const PRODUCTO_CONDICION_ESTADO_OPTIONS = [
    { key: "STOCK", value: "STOCK", label: "STOCK" },
    { key: "LIBRE", value: "LIBRE", label: "LIBRE" }
];

export const SOLICITUD_REPOSICION_ESTADO_OPTIONS = stateOptions([
    "POR APROBAR",
    "POR ATENDER",
    "ATENDIDO",
    "RECHAZADO",
    DOCUMENT_STATES.ANULADO
]);
