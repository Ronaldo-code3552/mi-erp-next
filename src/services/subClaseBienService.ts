import apiClient from '@/api/apiCliente';
import { ApiResponse } from '@/types';
import { SubClaseBien } from '@/types/producto.types';

interface SubClaseBienFilters {
    estado?: boolean | number;
    clase_bien?: string[];
}

export const subClaseBienService = {
    getAll: async (
        page = 1,
        pageSize = 20,
        search = '',
        filters?: SubClaseBienFilters
    ): Promise<ApiResponse<SubClaseBien[]>> => {
        const response = await apiClient.get('/SubClaseBien', {
            params: {
                page,
                pageSize,
                search: search.trim() || undefined,
                filters: filters ? JSON.stringify(filters) : undefined
            }
        });
        return response.data;
    }
};
