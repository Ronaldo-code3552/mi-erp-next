import apiClient from '@/api/apiCliente';
import { ApiResponse } from '@/types';
import { ClaseProveedor, ClaseProveedorFilters } from '@/types/claseProveedor.types';

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

export const claseProveedorService = {
    getAll: async (
        page = 1,
        pageSize = 20,
        term = '',
        filters: ClaseProveedorFilters = {}
    ): Promise<ApiResponse<ClaseProveedor[]>> => {
        const response = await apiClient.get('/proveedores/ClaseProveedor', {
            params: {
                PageNumber: page,
                PageSize: pageSize,
                SearchTerm: term || undefined,
                FiltroEstado: filters.FiltroEstado
            }
        });
        const payload = response.data as ApiResponse<ClaseProveedor[]>;

        return {
            isSuccess: payload.isSuccess,
            data: payload.data || [],
            meta: normalizeMeta(payload.meta, page, pageSize),
            message: payload.message
        };
    }
};
