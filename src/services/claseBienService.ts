import apiClient from '@/api/apiCliente';
import { ApiResponse } from '@/types';
import { ClaseBien, ClaseBienFilters, ClaseBienPayload } from '@/types/claseBien.types';

const serializeFilters = (filters?: ClaseBienFilters): string | undefined => {
    if (!filters) return undefined;

    const cleaned = Object.fromEntries(
        Object.entries(filters).filter(([, value]) => value !== undefined && value !== null && value !== '')
    );

    return Object.keys(cleaned).length ? JSON.stringify(cleaned) : undefined;
};

export const claseBienService = {
    getAll: async (
        page = 1,
        pageSize = 20,
        search = '',
        filters?: ClaseBienFilters
    ): Promise<ApiResponse<ClaseBien[]>> => {
        const response = await apiClient.get('/ClaseBien', {
            params: {
                page,
                pageSize,
                search: search.trim() || undefined,
                filters: serializeFilters(filters)
            }
        });
        return response.data;
    },

    getById: async (id: string): Promise<ApiResponse<ClaseBien>> => {
        const response = await apiClient.get(`/ClaseBien/${id}`);
        return response.data;
    },

    create: async (data: ClaseBienPayload): Promise<ApiResponse<string>> => {
        const response = await apiClient.post('/ClaseBien', data);
        return response.data;
    },

    update: async (id: string, data: ClaseBienPayload): Promise<ApiResponse<string>> => {
        const response = await apiClient.put(`/ClaseBien/${id}`, data);
        return response.data;
    },

    delete: async (id: string): Promise<ApiResponse<string>> => {
        const response = await apiClient.delete(`/ClaseBien/${id}`);
        return response.data;
    }
};
