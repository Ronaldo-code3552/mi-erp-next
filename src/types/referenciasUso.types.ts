export type ReferenciaUsoSourceType =
    | "DOCUMENTO_COMPRA"
    | "NOTA_INGRESO"
    | "GUIA_REMISION"
    | "ORDEN_COMPRA_SERVICIO";

export type ReferenciaDocumentoModule =
    | "DOCUMENTO_COMPRA"
    | "NOTA_CREDITO"
    | "NOTA_DEBITO"
    | "NOTA_INGRESO"
    | "GUIA_REMISION"
    | "ORDEN_COMPRA_SERVICIO";

export interface ReferenciaUsoItem {
    idReferencia?: string | null;
    documentocompraId?: string | null;
    documentoCompraId?: string | null;
    notasingresosId?: string | null;
    notaIngresoId?: string | null;
    guiasremisionId?: string | null;
    guiaRemisionId?: string | null;
    ordencompraservicioId?: string | null;
    ordenCompraServicioId?: string | null;
    tipodoccomercialId?: string | null;
    tipoDocComercialId?: string | null;
    serie?: string | null;
    numero?: string | null;
    numero_ordencompra?: string | null;
    numeroOrdenCompra?: string | null;
    fecha_emision?: string | null;
    fechaEmision?: string | null;
    fecha_doc?: string | null;
    fechaDoc?: string | null;
    total?: number | null;
    estado?: string | null;
}

export type ReferenciaUsoCollection =
    | ReferenciaUsoItem[]
    | string
    | null;

export interface ReferenciasUso {
    DOCUMENTO_COMPRA?: ReferenciaUsoCollection;
    NOTA_INGRESO?: ReferenciaUsoCollection;
    GUIA_REMISION?: ReferenciaUsoCollection;
    ORDEN_COMPRA_SERVICIO?: ReferenciaUsoCollection;
    [key: string]: unknown;
}

export interface ReferenciaDocumentoNormalizada {
    key: string;
    navigationKey: string;
    sourceType: ReferenciaUsoSourceType;
    id: string;
    module: ReferenciaDocumentoModule;
    title: string;
    displayNumber?: string;
    status?: string;
    date?: string;
    original: unknown;
}
