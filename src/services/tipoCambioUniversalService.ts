import apiClient from '@/api/apiCliente';
import { ApiResponse } from '@/types';
import {
    TipoCambioUniversal,
    TipoCambioUniversalFilters
} from '@/types/tipoCambioUniversal.types';

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

export const tipoCambioUniversalService = {
    getAll: async (
        page = 1,
        pageSize = 20,
        filters: TipoCambioUniversalFilters = {}
    ): Promise<ApiResponse<TipoCambioUniversal[]>> => {
        const response = await apiClient.get('/TipoCambioUniversal', {
            params: {
                PageNumber: page,
                PageSize: pageSize,
                SearchTerm: filters.SearchTerm || undefined,
                FechaInicio: filters.FechaInicio || undefined,
                FechaFin: filters.FechaFin || undefined,
                MonedaId: filters.MonedaId || undefined
            }
        });
        const payload = response.data as ApiResponse<TipoCambioUniversal[]>;

        return {
            isSuccess: payload.isSuccess,
            data: payload.data || [],
            meta: normalizeMeta(payload.meta, page, pageSize),
            message: payload.message
        };
    }
};
