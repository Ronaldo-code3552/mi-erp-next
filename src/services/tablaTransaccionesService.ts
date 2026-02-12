// src/services/tablaTransaccionesService.ts
import apiClient from '../api/apiCliente';
import { TablaTransacciones, TablaTransaccionesPayload } from '../types/tablaTransacciones.types';
import { ApiResponse } from '../types';

export const tablaTransaccionesService = {
    // 1. Listado por Empresa
    getByEmpresa: async (empresaId: string, page = 1, pageSize = 20, term = "", filters: any = null): Promise<ApiResponse<TablaTransacciones[]>> => {
        let filtersToSend = null;
        if (filters) {
            const cleaned: any = {};
            let hasData = false;
            Object.keys(filters).forEach(key => {
                if ((Array.isArray(filters[key]) && filters[key].length > 0) || (filters[key] && !Array.isArray(filters[key]))) {
                    cleaned[key] = filters[key];
                    hasData = true;
                }
            });
            if (hasData) filtersToSend = JSON.stringify(cleaned);
        }

        const response = await apiClient.get(`/TablaTransacciones/empresa/${empresaId}`, {
            params: { page, pageSize, term, filters: filtersToSend }
        });
        return response.data;
    },

    // 2. Dropdowns
    getFormDropdowns: async (): Promise<ApiResponse<any>> => {
        const response = await apiClient.get(`/TablaTransacciones/form-dropdowns`);
        return response.data;
    },

    // 3. Crear
    create: async (data: TablaTransaccionesPayload): Promise<ApiResponse<string>> => {
        const response = await apiClient.post('/TablaTransacciones', data);
        return response.data;
    },

    // 4. Actualizar
    update: async (id: string, data: Partial<TablaTransaccionesPayload>): Promise<ApiResponse<string>> => {
        const response = await apiClient.put(`/TablaTransacciones/${id}`, data);
        return response.data;
    },

    // 5. Eliminar
    delete: async (id: string): Promise<ApiResponse<string>> => {
        const response = await apiClient.delete(`/TablaTransacciones/${id}`);
        return response.data;
    }
};