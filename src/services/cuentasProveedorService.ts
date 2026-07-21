import apiClient from '@/api/apiCliente';
import { ApiResponse } from '@/types';
import {
    CuentaProveedor,
    CuentaProveedorPayload,
    CuentasProveedorFilters
} from '@/types/cuentasProveedor.types';

const BASE_URL = '/CuentasProveedor';

const getErrorMessage = (error: unknown, fallback: string) => {
    if (typeof error === 'object' && error !== null) {
        const response = (error as { response?: { data?: { message?: unknown } } }).response;
        const message = response?.data?.message;

        if (typeof message === 'string' && message.trim() !== '') {
            return message;
        }
    }

    if (error instanceof Error && error.message) {
        return error.message;
    }

    return fallback;
};

const normalizeMeta = (
    meta: ApiResponse<unknown>['meta'],
    page: number,
    pageSize: number
) => ({
    totalRecords: Number(meta?.totalRecords ?? meta?.TotalRecords ?? 0),
    totalPages: Number(meta?.totalPages ?? meta?.TotalPages ?? 1),
    currentPage: Number(meta?.currentPage ?? meta?.CurrentPage ?? page),
    pageSize: Number(meta?.pageSize ?? meta?.PageSize ?? pageSize)
});

const normalizePayload = (payload: CuentaProveedorPayload): CuentaProveedorPayload => ({
    BancosId: payload.BancosId ?? null,
    NumeroCuenta: payload.NumeroCuenta?.trim() || null,
    Cci: payload.Cci?.trim() || null,
    MonedaId: payload.MonedaId?.trim() || null,
    Observacion: payload.Observacion?.trim() || null,
    TotalPagado: payload.TotalPagado ?? 0
});

export const cuentasProveedorService = {
    getByProveedor: async (
        proveedorId: string,
        page = 1,
        pageSize = 20,
        filters: CuentasProveedorFilters = {}
    ): Promise<ApiResponse<CuentaProveedor[]>> => {
        try {
            const response = await apiClient.get(`${BASE_URL}/proveedor/${proveedorId}`, {
                params: {
                    PageNumber: page,
                    PageSize: pageSize,
                    SearchTerm: filters.SearchTerm || undefined,
                    BancosId: filters.BancosId || undefined,
                    MonedaId: filters.MonedaId || undefined
                }
            });
            const payload = response.data as ApiResponse<CuentaProveedor[]>;

            return {
                isSuccess: payload.isSuccess,
                data: payload.data || [],
                meta: normalizeMeta(payload.meta, page, pageSize),
                message: payload.message
            };
        } catch (error) {
            return {
                isSuccess: false,
                data: [],
                message: getErrorMessage(error, 'Error al obtener las cuentas del proveedor')
            };
        }
    },

    create: async (
        proveedorId: string,
        payload: CuentaProveedorPayload
    ): Promise<ApiResponse<{ CuentasProveedorId?: string; cuentasProveedorId?: string }>> => {
        try {
            const response = await apiClient.post(
                `${BASE_URL}/proveedor/${proveedorId}`,
                normalizePayload(payload)
            );

            return response.data;
        } catch (error) {
            return {
                isSuccess: false,
                data: {},
                message: getErrorMessage(error, 'Error al registrar la cuenta del proveedor')
            };
        }
    },

    update: async (
        proveedorId: string,
        cuentaId: string,
        payload: CuentaProveedorPayload
    ): Promise<ApiResponse<unknown>> => {
        try {
            const response = await apiClient.put(
                `${BASE_URL}/proveedor/${proveedorId}/${cuentaId}`,
                normalizePayload(payload)
            );

            return response.data;
        } catch (error) {
            return {
                isSuccess: false,
                data: null,
                message: getErrorMessage(error, 'Error al actualizar la cuenta del proveedor')
            };
        }
    },

    delete: async (
        proveedorId: string,
        cuentaId: string
    ): Promise<ApiResponse<unknown>> => {
        try {
            const response = await apiClient.delete(`${BASE_URL}/proveedor/${proveedorId}/${cuentaId}`);
            return response.data;
        } catch (error) {
            return {
                isSuccess: false,
                data: null,
                message: getErrorMessage(error, 'Error al eliminar la cuenta del proveedor')
            };
        }
    }
};
