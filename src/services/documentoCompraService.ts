import apiClient from "@/api/apiCliente";
import { ApiResponse } from "@/types";
import {
    DocumentoCompra,
    DocumentoCompraCreatedDto,
    DocumentoCompraFiltros,
    DocumentoCompraPayload,
    DocumentoCompraReporteParams,
    TipoDocumentoComercialCompra
} from "@/types/documentoCompra.types";
import {
    FileDownloadResult,
    getFileNameFromContentDisposition
} from "@/utils/fileDownload";

const EMPRESA_ID = "005";
const BASE_URL = "/DocumentoCompra";

const getErrorMessage = (error: unknown, fallback: string) => {
    if (typeof error === "object" && error !== null) {
        const response = (error as { response?: { data?: { message?: unknown } } }).response;
        if (typeof response?.data?.message === "string") return response.data.message;
    }
    return error instanceof Error && error.message ? error.message : fallback;
};

const buildFiltersString = (filters?: DocumentoCompraFiltros) => {
    if (!filters) return undefined;
    const entries = Object.entries(filters).filter(([, value]) => (
        Array.isArray(value) ? value.length > 0 : value !== undefined && value !== null && value !== ""
    ));
    return entries.length ? JSON.stringify(Object.fromEntries(entries)) : undefined;
};

const buildReporteParams = (params: DocumentoCompraReporteParams = {}) => {
    const query: Record<string, string | boolean> = {};
    const search = params.search?.trim();
    const serializedFilters = buildFiltersString(params.filters);

    if (search) query.search = search;
    if (serializedFilters) query.filters = serializedFilters;
    if (params.soloDisponibles !== undefined) query.soloDisponibles = params.soloDisponibles;
    if (params.soloStock !== undefined) query.soloStock = params.soloStock;

    return query;
};

const descargarReporte = async (
    empresaId: string,
    format: "excel" | "pdf",
    params: DocumentoCompraReporteParams = {}
): Promise<FileDownloadResult> => {
    const response = await apiClient.get<Blob>(
        `${BASE_URL}/empresa/${empresaId.trim()}/reporte/${format}`,
        {
            params: buildReporteParams(params),
            responseType: "blob"
        }
    );
    const disposition = response.headers["content-disposition"];
    const contentType = response.headers["content-type"];

    return {
        blob: response.data,
        fileName: getFileNameFromContentDisposition(
            typeof disposition === "string" ? disposition : undefined
        ),
        contentType: typeof contentType === "string" ? contentType : undefined
    };
};

const normalizeMeta = (meta: ApiResponse<unknown>["meta"], page: number, pageSize: number) => ({
    totalRecords: Number(meta?.totalRecords ?? meta?.TotalRecords ?? 0),
    totalPages: Number(meta?.totalPages ?? meta?.TotalPages ?? 1),
    currentPage: Number(meta?.currentPage ?? meta?.CurrentPage ?? page),
    pageSize: Number(meta?.pageSize ?? meta?.PageSize ?? pageSize)
});

const firstString = (source: Record<string, unknown>, keys: string[]) => {
    for (const key of keys) {
        const value = source[key];
        if (value !== null && value !== undefined && String(value).trim()) {
            return String(value).trim();
        }
    }
    return "";
};

const normalizeCreatedDocument = (payload: unknown): ApiResponse<DocumentoCompraCreatedDto> => {
    const response = (typeof payload === "object" && payload !== null
        ? payload
        : {}) as Record<string, unknown>;
    const dataValue = response.data ?? response.Data;
    const data = (typeof dataValue === "object" && dataValue !== null
        ? dataValue
        : response) as Record<string, unknown>;
    const documentoCompraId = typeof dataValue === "string"
        ? dataValue.trim()
        : firstString(data, [
            "documentoCompraId",
            "documentocompraId",
            "DocumentoCompraId"
        ]);
    const successValue = response.isSuccess ?? response.IsSuccess;

    return {
        isSuccess: typeof successValue === "boolean"
            ? successValue
            : Boolean(documentoCompraId),
        data: { documentoCompraId },
        message: firstString(response, ["message", "Message"]) || undefined
    };
};

export const documentoCompraService = {
    getByEmpresa: async (
        empresaId: string,
        page = 1,
        pageSize = 20,
        term = "",
        filters: DocumentoCompraFiltros = {}
    ): Promise<ApiResponse<DocumentoCompra[]>> => {
        try {
            const response = await apiClient.get(`${BASE_URL}/empresa/${empresaId.trim()}`, {
                params: { page, pageSize, search: term.trim() || undefined, filters: buildFiltersString(filters) }
            });
            const payload = response.data as ApiResponse<DocumentoCompra[]>;
            return {
                isSuccess: payload?.isSuccess ?? true,
                data: payload?.data || [],
                meta: normalizeMeta(payload?.meta, page, pageSize),
                message: payload?.message
            };
        } catch (error) {
            return { isSuccess: false, data: [], message: getErrorMessage(error, "Error al obtener documentos de compra") };
        }
    },

    getAll: async (
        page = 1,
        pageSize = 20,
        term = "",
        filters: DocumentoCompraFiltros = {}
    ): Promise<ApiResponse<DocumentoCompra[]>> => {
        try {
            const response = await apiClient.get(`${BASE_URL}/empresa/${EMPRESA_ID}`, {
                params: { page, pageSize, search: term.trim() || undefined, filters: buildFiltersString(filters) }
            });
            const payload = response.data as ApiResponse<DocumentoCompra[]>;
            return {
                isSuccess: payload?.isSuccess ?? true,
                data: payload?.data || [],
                meta: normalizeMeta(payload?.meta, page, pageSize),
                message: payload?.message
            };
        } catch (error) {
            return { isSuccess: false, data: [], message: getErrorMessage(error, "Error al obtener documentos de compra") };
        }
    },

    getById: async (id: string): Promise<ApiResponse<DocumentoCompra>> => {
        try {
            const response = await apiClient.get(`${BASE_URL}/${id.trim()}`);
            return response.data;
        } catch (error) {
            return { isSuccess: false, data: {}, message: getErrorMessage(error, "Error al obtener el documento de compra") };
        }
    },

    getDisponiblesByEmpresa: async (
        empresaId: string,
        page = 1,
        pageSize = 20,
        term = "",
        filters: DocumentoCompraFiltros = {},
        soloStock = false
    ): Promise<ApiResponse<DocumentoCompra[]>> => {
        try {
            const response = await apiClient.get(`${BASE_URL}/empresa/${empresaId.trim()}/disponibles`, {
                params: {
                    page,
                    pageSize,
                    search: term.trim() || undefined,
                    filters: buildFiltersString(filters),
                    soloStock
                }
            });
            const payload = response.data as ApiResponse<DocumentoCompra[]>;
            return {
                isSuccess: payload?.isSuccess ?? true,
                data: payload?.data || [],
                meta: normalizeMeta(payload?.meta, page, pageSize),
                message: payload?.message
            };
        } catch (error) {
            return { isSuccess: false, data: [], message: getErrorMessage(error, "Error al obtener documentos disponibles") };
        }
    },

    create: async (
        data: DocumentoCompraPayload
    ): Promise<ApiResponse<DocumentoCompraCreatedDto>> => {
        try {
            const response = await apiClient.post(`${BASE_URL}/empresa/${EMPRESA_ID}`, data);
            return normalizeCreatedDocument(response.data);
        } catch (error) {
            return {
                isSuccess: false,
                data: { documentoCompraId: "" },
                message: getErrorMessage(error, "Error al crear el documento de compra")
            };
        }
    },

    update: async (id: string, data: DocumentoCompraPayload): Promise<ApiResponse<unknown>> => {
        try {
            const response = await apiClient.put(`${BASE_URL}/empresa/${EMPRESA_ID}/${id.trim()}`, data);
            return response.data;
        } catch (error) {
            return { isSuccess: false, data: null, message: getErrorMessage(error, "Error al actualizar el documento de compra") };
        }
    },

    anular: async (id: string): Promise<ApiResponse<unknown>> => {
        try {
            const response = await apiClient.post(`${BASE_URL}/empresa/${EMPRESA_ID}/${id.trim()}/anular`);
            return response.data;
        } catch (error) {
            return { isSuccess: false, data: null, message: getErrorMessage(error, "Error al anular el documento de compra") };
        }
    },

    descargarReporteExcel: (
        empresaId: string,
        params: DocumentoCompraReporteParams = {}
    ): Promise<FileDownloadResult> => descargarReporte(empresaId, "excel", params),

    descargarReportePdf: (
        empresaId: string,
        params: DocumentoCompraReporteParams = {}
    ): Promise<FileDownloadResult> => descargarReporte(empresaId, "pdf", params),

    delete: async (id: string): Promise<ApiResponse<unknown>> => {
        try {
            const response = await apiClient.delete(`${BASE_URL}/empresa/${EMPRESA_ID}/${id.trim()}`);
            return response.data;
        } catch (error) {
            return { isSuccess: false, data: null, message: getErrorMessage(error, "Error al eliminar el documento de compra") };
        }
    },

    getTiposDocumento: async (term = ""): Promise<ApiResponse<TipoDocumentoComercialCompra[]>> => {
        try {
            const response = await apiClient.get("/TipoDocumentoComercial", {
                params: { page: 1, pageSize: 20, search: term || "DOCUMENTO_COMPRA" }
            });
            const payload = response.data as ApiResponse<TipoDocumentoComercialCompra[]>;
            const data = (payload.data || []).filter(item => (
                item.estado !== false && String(item.tabla_referencia || "").toUpperCase() === "DOCUMENTO_COMPRA"
            ));
            return { ...payload, data };
        } catch (error) {
            return { isSuccess: false, data: [], message: getErrorMessage(error, "Error al obtener tipos de documento") };
        }
    }
};
