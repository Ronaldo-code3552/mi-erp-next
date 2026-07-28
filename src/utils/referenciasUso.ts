import type {
    ReferenciaDocumentoModule,
    ReferenciaDocumentoNormalizada,
    ReferenciaUsoSourceType
} from "@/types/referenciasUso.types";

export const REFERENCED_DOCUMENT_MAX_DEPTH = 6;

const SOURCE_TYPES: ReferenciaUsoSourceType[] = [
    "DOCUMENTO_COMPRA",
    "NOTA_INGRESO",
    "GUIA_REMISION",
    "ORDEN_COMPRA_SERVICIO"
];

const serializedWarnings = new Set<string>();

const isRecord = (value: unknown): value is Record<string, unknown> => (
    typeof value === "object" && value !== null && !Array.isArray(value)
);

const stringValue = (
    source: Record<string, unknown>,
    keys: string[]
) => {
    for (const key of keys) {
        const value = source[key];
        if (value !== undefined && value !== null) {
            const normalized = String(value).trim();
            if (normalized) return normalized;
        }
    }

    return "";
};

const parseSerializedValue = (
    value: string,
    warningKey: string
): unknown => {
    if (!serializedWarnings.has(warningKey)) {
        console.warn(
            `[referenciasUso] ${warningKey} llegó serializado como texto; se aplicó compatibilidad temporal.`
        );
        serializedWarnings.add(warningKey);
    }

    try {
        return JSON.parse(value) as unknown;
    } catch {
        console.warn(
            `[referenciasUso] No se pudo interpretar la colección ${warningKey}.`
        );
        return null;
    }
};

const normalizeContainer = (value: unknown): Record<string, unknown> | null => {
    if (typeof value === "string") {
        const parsed = parseSerializedValue(value, "referenciasUso");
        return isRecord(parsed) ? parsed : null;
    }

    return isRecord(value) ? value : null;
};

const normalizeCollection = (
    sourceType: ReferenciaUsoSourceType,
    value: unknown
): unknown[] => {
    const parsed = typeof value === "string"
        ? parseSerializedValue(value, sourceType)
        : value;

    return Array.isArray(parsed) ? parsed : [];
};

const resolveModule = (
    sourceType: ReferenciaUsoSourceType,
    source: Record<string, unknown>
): ReferenciaDocumentoModule => {
    if (sourceType !== "DOCUMENTO_COMPRA") return sourceType;

    const documentType = stringValue(source, [
        "tipodoccomercialId",
        "tipoDocComercialId",
        "TipoDocComercialId"
    ]).toUpperCase();

    if (documentType === "X067") return "NOTA_CREDITO";
    if (documentType === "X068") return "NOTA_DEBITO";
    return "DOCUMENTO_COMPRA";
};

const resolveId = (
    sourceType: ReferenciaUsoSourceType,
    source: Record<string, unknown>
) => {
    const keysBySource: Record<ReferenciaUsoSourceType, string[]> = {
        DOCUMENTO_COMPRA: [
            "documentocompraId",
            "documentoCompraId",
            "DocumentoCompraId",
            "idReferencia"
        ],
        NOTA_INGRESO: [
            "notasingresosId",
            "notaIngresoId",
            "NotaIngresoId",
            "idReferencia"
        ],
        GUIA_REMISION: [
            "guiasremisionId",
            "guiaRemisionId",
            "GuiaRemisionId",
            "idReferencia"
        ],
        ORDEN_COMPRA_SERVICIO: [
            "ordencompraservicioId",
            "ordenCompraServicioId",
            "OrdenCompraServicioId",
            "idReferencia"
        ]
    };

    return stringValue(source, keysBySource[sourceType]);
};

const titleByModule: Record<ReferenciaDocumentoModule, string> = {
    DOCUMENTO_COMPRA: "Documento de compra",
    NOTA_CREDITO: "Nota de crédito",
    NOTA_DEBITO: "Nota de débito",
    NOTA_INGRESO: "Nota de ingreso",
    GUIA_REMISION: "Guía de remisión",
    ORDEN_COMPRA_SERVICIO: "Orden de compra/servicio"
};

const resolveDisplayNumber = (
    module: ReferenciaDocumentoModule,
    source: Record<string, unknown>,
    fallbackId: string
) => {
    if (
        module === "DOCUMENTO_COMPRA"
        || module === "NOTA_CREDITO"
        || module === "NOTA_DEBITO"
    ) {
        const serie = stringValue(source, ["serie", "Serie"]);
        const numero = stringValue(source, ["numero", "Numero"]);
        const composed = [serie, numero].filter(Boolean).join(" - ");
        return composed || fallbackId;
    }

    if (module === "ORDEN_COMPRA_SERVICIO") {
        return stringValue(source, [
            "numero_ordencompra",
            "numeroOrdenCompra",
            "NumeroOrdenCompra"
        ]) || fallbackId;
    }

    return stringValue(source, [
        "numero",
        "Numero",
        "documentoReferencia"
    ]) || fallbackId;
};

export const normalizeReferenciasUso = (
    referenciasUso: unknown
): ReferenciaDocumentoNormalizada[] => {
    const container = normalizeContainer(referenciasUso);
    if (!container) return [];

    const normalized: ReferenciaDocumentoNormalizada[] = [];
    const seen = new Set<string>();

    for (const sourceType of SOURCE_TYPES) {
        const collection = normalizeCollection(sourceType, container[sourceType]);

        for (const original of collection) {
            if (!isRecord(original)) continue;

            const id = resolveId(sourceType, original);
            if (!id) continue;

            const key = `${sourceType}:${id}`;
            if (seen.has(key)) continue;
            seen.add(key);

            const resolvedModule = resolveModule(sourceType, original);
            normalized.push({
                key,
                navigationKey: `${resolvedModule}:${id}`,
                sourceType,
                id,
                module: resolvedModule,
                title: titleByModule[resolvedModule],
                displayNumber: resolveDisplayNumber(resolvedModule, original, id),
                status: stringValue(original, ["estado", "Estado"]) || undefined,
                date: stringValue(original, [
                    "fecha_doc",
                    "fechaDoc",
                    "FechaDoc",
                    "fecha_emision",
                    "fechaEmision",
                    "FechaEmision"
                ]) || undefined,
                original
            });
        }
    }

    return normalized;
};

export const resolveReferencedDocumentPath = (
    reference: ReferenciaDocumentoNormalizada
) => {
    const encodedId = encodeURIComponent(reference.id);

    switch (reference.module) {
        case "DOCUMENTO_COMPRA":
        case "NOTA_CREDITO":
        case "NOTA_DEBITO":
            return `/dashboard/documento-comercial/editar/${encodedId}`;
        case "NOTA_INGRESO":
            return `/dashboard/notas-ingreso/editar/${encodedId}`;
        case "GUIA_REMISION":
            return `/dashboard/guias-remision/editar/${encodedId}`;
        case "ORDEN_COMPRA_SERVICIO":
            return `/dashboard/orden-compra-servicio/editar/${encodedId}`;
    }
};

export const parseReferenceTrail = (value: string | null) => {
    if (!value) return [];

    return value
        .split("|")
        .map(item => item.trim())
        .filter(Boolean)
        .slice(0, REFERENCED_DOCUMENT_MAX_DEPTH);
};

export const getSafeDashboardReturnPath = (
    value: string | null,
    fallback: string
) => {
    if (!value || !value.startsWith("/dashboard/") || value.startsWith("//")) {
        return fallback;
    }

    return value;
};
