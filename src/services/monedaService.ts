import apiClient from '@/api/apiCliente';
import { ApiResponse } from '@/types';
import { Moneda } from '@/types/moneda.types';

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

export const monedaService = {
    getAll: async (
        page = 1,
        pageSize = 20,
        term = ''
    ): Promise<ApiResponse<Moneda[]>> => {
        const response = await apiClient.get('/Moneda', {
            params: {
                page,
                pageSize,
                search: term || undefined
            }
        });
        const payload = response.data as ApiResponse<Moneda[]>;

        return {
            isSuccess: payload.isSuccess,
            data: payload.data || [],
            meta: normalizeMeta(payload.meta, page, pageSize),
            message: payload.message
        };
    }
};
