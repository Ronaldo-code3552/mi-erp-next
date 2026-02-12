// src/services/motivoTrasladoService.ts
import apiClient from '../api/apiCliente';
import { MotivoTraslado, MotivoTrasladoPayload } from '../types/motivoTraslado.types';
import { ApiResponse } from '../types';

export const motivoTrasladoService = {
    // 1. Listado con filtros JSON
    getByEmpresa: async (page = 1, pageSize = 20, term = "", filters: any = null): Promise<ApiResponse<MotivoTraslado[]>> => {
        let filtersToSend = null;
        if (filters) {
            const cleaned: any = {};
            let hasData = false;
            // Limpieza de filtros vacíos
            Object.keys(filters).forEach(key => {
                if ((Array.isArray(filters[key]) && filters[key].length > 0) || (filters[key] && !Array.isArray(filters[key]))) {
                    cleaned[key] = filters[key];
                    hasData = true;
                }
            });
            if (hasData) filtersToSend = JSON.stringify(cleaned);
        }

        // Nota: Tu controller usa 'GetByEmpresaIdAsync' pero no pide empresaId en la ruta, 
        // parece que lo toma internamente o el método C# se llama así pero el endpoint es /list.
        // Basado en tu Controller C#: [HttpGet("list")]
        const response = await apiClient.get(`/MotivoTraslado/list`, {
            params: { page, pageSize, term, filters: filtersToSend }
        });
        return response.data;
    },

    // 2. Dropdowns
    getFormDropdowns: async (): Promise<ApiResponse<any>> => {
        const response = await apiClient.get(`/MotivoTraslado/form-dropdowns`);
        return response.data;
    },

    // 3. Crear
    create: async (data: MotivoTrasladoPayload): Promise<ApiResponse<string>> => {
        const response = await apiClient.post('/MotivoTraslado', data);
        return response.data;
    },

    // 4. Actualizar
    update: async (id: string, data: MotivoTrasladoPayload): Promise<ApiResponse<string>> => {
        const response = await apiClient.put(`/MotivoTraslado/${id}`, data);
        return response.data;
    },

    // 5. Anular (Cambio de estado)
    anular: async (id: string): Promise<ApiResponse<string>> => {
        const response = await apiClient.patch(`/MotivoTraslado/anular/${id}`);
        return response.data;
    },

    // 6. Eliminar (Físico)
    delete: async (id: string): Promise<ApiResponse<string>> => {
        const response = await apiClient.delete(`/MotivoTraslado/${id}`);
        return response.data;
    }
};