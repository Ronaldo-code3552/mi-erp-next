export const DOCUMENTO_PDF_REFERENCIAS = {
    ORDEN_COMPRA_SERVICIO: "ORDEN_COMPRA_SERVICIO",
    DOCUMENTO_COMPRA: "DOCUMENTO_COMPRA"
} as const;

export type DocumentoPdfReferenciaTabla =
    typeof DOCUMENTO_PDF_REFERENCIAS[keyof typeof DOCUMENTO_PDF_REFERENCIAS];

export type DocumentoPdfTipoContenido =
    | "application/pdf"
    | "image/jpeg"
    | "image/png";

export type DocumentoPdfUploadEstado =
    | "pendiente"
    | "subiendo"
    | "completado"
    | "error";

export interface DocumentoPdfMetadata {
    id: number;
    referenciaId: string;
    referenciaTabla: DocumentoPdfReferenciaTabla;
    nombreArchivo: string;
    tipoContenido: DocumentoPdfTipoContenido;
    tamanioBytes: number;
    fechaRegistro: string;
}

export interface DocumentoPdfUploadInput {
    referenciaId: string;
    referenciaTabla: DocumentoPdfReferenciaTabla;
    archivo: File;
}

export interface DocumentoPdfDeleteInput {
    id: number;
    referenciaId: string;
    referenciaTabla: DocumentoPdfReferenciaTabla;
}

export interface DocumentoPdfDeleteByReferenceInput {
    referenciaId: string;
    referenciaTabla: DocumentoPdfReferenciaTabla;
}

export interface DocumentoPdfDeleteByReferenceResult {
    cantidadEliminada: number;
}

export interface DocumentoPdfPendingFile {
    id: string;
    archivo: File;
    estado: DocumentoPdfUploadEstado;
    error?: string;
}

export interface DocumentoPdfUploadResult {
    archivo: File;
    isSuccess: boolean;
    metadata?: DocumentoPdfMetadata;
    message?: string;
}

export interface DocumentoPdfBatchUploadResult {
    resultados: DocumentoPdfUploadResult[];
    exitosos: DocumentoPdfUploadResult[];
    fallidos: DocumentoPdfUploadResult[];
}

export interface DocumentoPdfPartialUploadError {
    nombreArchivo: string;
    message: string;
}

export interface DocumentoPdfFormSubmitResult {
    archivosPendientes: File[];
    refreshAdjuntos?: boolean;
}
