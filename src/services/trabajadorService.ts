import apiClient from '@/api/apiCliente';
import { ApiResponse } from '@/types';
import { Trabajador, TrabajadorFilters } from '@/types/trabajador.types';

const EMPRESA_ID = '005';

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

export const trabajadorService = {
    getAll: async (
        empresaId = EMPRESA_ID,
        page = 1,
        pageSize = 20,
        term = '',
        filters: TrabajadorFilters = {}
    ): Promise<ApiResponse<Trabajador[]>> => {
        const response = await apiClient.get(`/Trabajador/empresa/${empresaId}`, {
            params: {
                page,
                pageSize,
                search: term || undefined,
                estado: filters.estado,
                docidentId: filters.docidentId || undefined,
                cargoId: filters.cargoId || undefined,
                areaId: filters.areaId || undefined
            }
        });
        const payload = response.data as ApiResponse<Trabajador[]>;

        return {
            isSuccess: payload.isSuccess,
            data: payload.data || [],
            meta: normalizeMeta(payload.meta, page, pageSize),
            message: payload.message
        };
    },

    getByEmpresa: async (
        empresaId = EMPRESA_ID,
        page = 1,
        pageSize = 20,
        term = '',
        filters: TrabajadorFilters = { estado: true }
    ): Promise<ApiResponse<Trabajador[]>> => {
        return trabajadorService.getAll(empresaId, page, pageSize, term, filters);
    }
};
