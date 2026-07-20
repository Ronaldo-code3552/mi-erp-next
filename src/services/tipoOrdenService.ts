import apiClient from '@/api/apiCliente';
import { ApiResponse } from '@/types';
import { TipoOrden, TipoOrdenFilters } from '@/types/tipoOrden.types';

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

export const tipoOrdenService = {
    getAll: async (
        page = 1,
        pageSize = 20,
        term = '',
        filters: TipoOrdenFilters = {}
    ): Promise<ApiResponse<TipoOrden[]>> => {
        const response = await apiClient.get('/TipoOrden', {
            params: {
                PageNumber: page,
                PageSize: pageSize,
                SearchTerm: term || undefined,
                FiltroEstado: filters.FiltroEstado
            }
        });
        const payload = response.data as ApiResponse<TipoOrden[]>;

        return {
            isSuccess: payload.isSuccess,
            data: payload.data || [],
            meta: normalizeMeta(payload.meta, page, pageSize),
            message: payload.message
        };
    }
};
