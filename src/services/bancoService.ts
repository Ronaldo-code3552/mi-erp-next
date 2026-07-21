import apiClient from '@/api/apiCliente';
import { ApiResponse } from '@/types';
import { Banco } from '@/types/banco.types';

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

export const bancoService = {
    getAll: async (
        page = 1,
        pageSize = 20,
        search = ''
    ): Promise<ApiResponse<Banco[]>> => {
        const response = await apiClient.get('/Bancos', {
            params: {
                PageNumber: page,
                PageSize: pageSize,
                SearchTerm: search || undefined
            }
        });
        const payload = response.data as ApiResponse<Banco[]>;

        return {
            isSuccess: payload.isSuccess,
            data: payload.data || [],
            meta: normalizeMeta(payload.meta, page, pageSize),
            message: payload.message
        };
    }
};
