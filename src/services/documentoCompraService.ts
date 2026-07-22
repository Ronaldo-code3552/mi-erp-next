import apiClient from "@/api/apiCliente";
import { ApiResponse } from "@/types";
import {
    DocumentoCompra,
    DocumentoCompraFiltros,
    DocumentoCompraPayload,
    TipoDocumentoComercialCompra
} from "@/types/documentoCompra.types";

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

const normalizeMeta = (meta: ApiResponse<unknown>["meta"], page: number, pageSize: number) => ({
    totalRecords: Number(meta?.totalRecords ?? meta?.TotalRecords ?? 0),
    totalPages: Number(meta?.totalPages ?? meta?.TotalPages ?? 1),
    currentPage: Number(meta?.currentPage ?? meta?.CurrentPage ?? page),
    pageSize: Number(meta?.pageSize ?? meta?.PageSize ?? pageSize)
});

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

    create: async (data: DocumentoCompraPayload): Promise<ApiResponse<{ documentoCompraId?: string; documentocompraId?: string }>> => {
        try {
            const response = await apiClient.post(`${BASE_URL}/empresa/${EMPRESA_ID}`, data);
            return response.data;
        } catch (error) {
            return { isSuccess: false, data: {}, message: getErrorMessage(error, "Error al crear el documento de compra") };
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
