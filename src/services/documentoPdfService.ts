import apiClient from "@/api/apiCliente";
import { ApiResponse } from "@/types";
import {
    DocumentoPdfBatchUploadResult,
    DocumentoPdfDeleteByReferenceInput,
    DocumentoPdfDeleteByReferenceResult,
    DocumentoPdfDeleteInput,
    DocumentoPdfMetadata,
    DocumentoPdfReferenciaTabla,
    DocumentoPdfTipoContenido,
    DocumentoPdfUploadInput,
    DocumentoPdfUploadResult
} from "@/types/documentoPdf.types";

const BASE_URL = "/Documentos";

type UnknownRecord = Record<string, unknown>;

const asRecord = (value: unknown): UnknownRecord => (
    typeof value === "object" && value !== null ? value as UnknownRecord : {}
);

const firstValue = (source: UnknownRecord, keys: string[]) => {
    for (const key of keys) {
        if (source[key] !== null && source[key] !== undefined) return source[key];
    }
    return undefined;
};

const firstString = (source: UnknownRecord, keys: string[]) => {
    const value = firstValue(source, keys);
    return value === null || value === undefined ? "" : String(value).trim();
};

const asAllowedContentType = (value: unknown): DocumentoPdfTipoContenido => {
    const contentType = String(value || "").split(";")[0].trim().toLowerCase();
    if (contentType === "image/jpeg" || contentType === "image/png") return contentType;
    return "application/pdf";
};

const normalizeMetadata = (
    value: unknown,
    fallbackReference: DocumentoPdfReferenciaTabla
): DocumentoPdfMetadata => {
    const raw = asRecord(value);
    const referenciaTabla = firstString(raw, [
        "referenciaTabla",
        "ReferenciaTabla",
        "referencia_tabla"
    ]);

    return {
        id: Number(firstValue(raw, ["id", "Id", "documentoId", "DocumentoId"])) || 0,
        referenciaId: firstString(raw, ["referenciaId", "ReferenciaId", "referencia_id"]),
        referenciaTabla: (
            referenciaTabla === "ORDEN_COMPRA_SERVICIO"
            || referenciaTabla === "DOCUMENTO_COMPRA"
                ? referenciaTabla
                : fallbackReference
        ),
        nombreArchivo: firstString(raw, [
            "nombreArchivo",
            "NombreArchivo",
            "nombre_archivo"
        ]),
        tipoContenido: asAllowedContentType(firstValue(raw, [
            "tipoContenido",
            "TipoContenido",
            "tipo_contenido"
        ])),
        tamanioBytes: Number(firstValue(raw, [
            "tamanioBytes",
            "TamanioBytes",
            "tamanoBytes",
            "TamanoBytes",
            "tamanio_bytes"
        ])) || 0,
        fechaRegistro: firstString(raw, [
            "fechaRegistro",
            "FechaRegistro",
            "fecha_registro"
        ])
    };
};

const responseMessage = (payload: unknown) => {
    const raw = asRecord(payload);
    return firstString(raw, ["message", "Message", "title", "Title"]);
};

const parseBlobErrorMessage = async (error: unknown, fallback: string) => {
    const response = asRecord(asRecord(error).response);
    const data = response.data;

    if (typeof Blob !== "undefined" && data instanceof Blob) {
        const text = await data.text();
        try {
            const parsed = JSON.parse(text) as unknown;
            return responseMessage(parsed) || text.trim() || fallback;
        } catch {
            return text.trim() || fallback;
        }
    }

    const message = responseMessage(data);
    if (message) return message;
    if (error instanceof Error && error.message) return error.message;
    return fallback;
};

const failedMetadata = (
    referenciaTabla: DocumentoPdfReferenciaTabla,
    referenciaId = ""
): DocumentoPdfMetadata => ({
    id: 0,
    referenciaId,
    referenciaTabla,
    nombreArchivo: "",
    tipoContenido: "application/pdf",
    tamanioBytes: 0,
    fechaRegistro: ""
});

const normalizeSingleResponse = (
    payload: unknown,
    referenciaTabla: DocumentoPdfReferenciaTabla,
    referenciaId: string
): ApiResponse<DocumentoPdfMetadata> => {
    const raw = asRecord(payload);
    const rawData = firstValue(raw, ["data", "Data"]);
    const isSuccessValue = firstValue(raw, ["isSuccess", "IsSuccess"]);
    const isSuccess = typeof isSuccessValue === "boolean" ? isSuccessValue : Boolean(rawData);

    return {
        isSuccess,
        data: rawData
            ? normalizeMetadata(rawData, referenciaTabla)
            : failedMetadata(referenciaTabla, referenciaId),
        message: responseMessage(raw)
    };
};

const normalizeListResponse = (
    payload: unknown,
    referenciaTabla: DocumentoPdfReferenciaTabla
): ApiResponse<DocumentoPdfMetadata[]> => {
    const raw = asRecord(payload);
    const rawData = firstValue(raw, ["data", "Data"]);
    const list = Array.isArray(rawData) ? rawData : [];
    const isSuccessValue = firstValue(raw, ["isSuccess", "IsSuccess"]);

    return {
        isSuccess: typeof isSuccessValue === "boolean" ? isSuccessValue : true,
        data: list.map(item => normalizeMetadata(item, referenciaTabla)),
        message: responseMessage(raw)
    };
};

export const formatDocumentoPdfUploadFailures = (
    result: DocumentoPdfBatchUploadResult
) => result.fallidos
    .map(item => `${item.archivo.name}: ${item.message || "Error al cargar"}`)
    .join("\n");

export const documentoPdfService = {
    upload: async (
        input: DocumentoPdfUploadInput
    ): Promise<ApiResponse<DocumentoPdfMetadata>> => {
        try {
            const formData = new FormData();
            formData.append("referenciaId", input.referenciaId);
            formData.append("referenciaTabla", input.referenciaTabla);
            formData.append("archivo", input.archivo);

            const response = await apiClient.post(`${BASE_URL}/upload`, formData);
            return normalizeSingleResponse(
                response.data,
                input.referenciaTabla,
                input.referenciaId
            );
        } catch (error: unknown) {
            return {
                isSuccess: false,
                data: failedMetadata(input.referenciaTabla, input.referenciaId),
                message: await parseBlobErrorMessage(error, "No se pudo subir el archivo.")
            };
        }
    },

    uploadSequentially: async (
        referenciaTabla: DocumentoPdfReferenciaTabla,
        referenciaId: string,
        archivos: File[]
    ): Promise<DocumentoPdfBatchUploadResult> => {
        const resultados: DocumentoPdfUploadResult[] = [];

        for (const archivo of archivos) {
            const response = await documentoPdfService.upload({
                referenciaId,
                referenciaTabla,
                archivo
            });

            resultados.push({
                archivo,
                isSuccess: response.isSuccess,
                metadata: response.isSuccess ? response.data : undefined,
                message: response.message
            });
        }

        return {
            resultados,
            exitosos: resultados.filter(item => item.isSuccess),
            fallidos: resultados.filter(item => !item.isSuccess)
        };
    },

    getByReference: async (
        referenciaTabla: DocumentoPdfReferenciaTabla,
        referenciaId: string,
        signal?: AbortSignal
    ): Promise<ApiResponse<DocumentoPdfMetadata[]>> => {
        try {
            const response = await apiClient.get(BASE_URL, {
                params: { referenciaTabla, referenciaId },
                signal
            });
            return normalizeListResponse(response.data, referenciaTabla);
        } catch (error: unknown) {
            return {
                isSuccess: false,
                data: [],
                message: await parseBlobErrorMessage(error, "No se pudieron cargar los archivos.")
            };
        }
    },

    getBlob: async (id: number, descargar = false): Promise<Blob> => {
        try {
            const response = await apiClient.get(`${BASE_URL}/${id}`, {
                params: descargar ? { descargar: true } : undefined,
                responseType: "blob"
            });
            return response.data as Blob;
        } catch (error: unknown) {
            throw new Error(await parseBlobErrorMessage(
                error,
                descargar
                    ? "No se pudo descargar el archivo."
                    : "No se pudo visualizar el archivo."
            ));
        }
    },

    openOrPreview: async (id: number): Promise<void> => {
        const blob = await documentoPdfService.getBlob(id);
        const objectUrl = window.URL.createObjectURL(blob);
        const openedWindow = window.open(objectUrl, "_blank");

        if (!openedWindow) {
            window.URL.revokeObjectURL(objectUrl);
            throw new Error("El navegador bloqueó la ventana de visualización.");
        }

        openedWindow.opener = null;
        window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 60_000);
    },

    download: async (id: number, nombreArchivo: string): Promise<void> => {
        const blob = await documentoPdfService.getBlob(id, true);
        const objectUrl = window.URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = objectUrl;
        link.download = nombreArchivo || `documento-${id}`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 1_000);
    },

    delete: async (input: DocumentoPdfDeleteInput): Promise<ApiResponse<unknown>> => {
        try {
            const response = await apiClient.delete(`${BASE_URL}/${input.id}`, {
                params: {
                    referenciaTabla: input.referenciaTabla,
                    referenciaId: input.referenciaId
                }
            });
            const raw = asRecord(response.data);
            const successValue = firstValue(raw, ["isSuccess", "IsSuccess"]);
            return {
                isSuccess: typeof successValue === "boolean" ? successValue : true,
                data: firstValue(raw, ["data", "Data"]) ?? null,
                message: responseMessage(raw)
            };
        } catch (error: unknown) {
            return {
                isSuccess: false,
                data: null,
                message: await parseBlobErrorMessage(error, "No se pudo eliminar el archivo.")
            };
        }
    },

    deleteByReference: async (
        input: DocumentoPdfDeleteByReferenceInput
    ): Promise<ApiResponse<DocumentoPdfDeleteByReferenceResult>> => {
        try {
            const response = await apiClient.delete(`${BASE_URL}/referencia`, {
                params: {
                    referenciaTabla: input.referenciaTabla,
                    referenciaId: input.referenciaId
                }
            });
            const raw = asRecord(response.data);
            const data = asRecord(firstValue(raw, ["data", "Data"]));
            return {
                isSuccess: Boolean(firstValue(raw, ["isSuccess", "IsSuccess"]) ?? true),
                data: {
                    cantidadEliminada: Number(firstValue(data, [
                        "cantidadEliminada",
                        "CantidadEliminada"
                    ])) || 0
                },
                message: responseMessage(raw)
            };
        } catch (error: unknown) {
            return {
                isSuccess: false,
                data: { cantidadEliminada: 0 },
                message: await parseBlobErrorMessage(
                    error,
                    "No se pudieron eliminar los archivos de la referencia."
                )
            };
        }
    }
};
