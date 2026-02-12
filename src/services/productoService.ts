// src/services/productoService.ts
import apiClient from '../api/apiCliente';
import { Producto } from '../types/producto.types';
import { ApiResponse } from '../types';

// ELIMINA ESTO: const API_URL = process.env.NEXT_PUBLIC_API_URL; 

export const productoService = {
    
    getByEmpresa: async (
        empresaId: string, 
        page = 1, 
        pageSize = 20, 
        term = "", 
        filters: any = null
    ): Promise<ApiResponse<Producto[]>> => {
        let filtersToSend = null;
        if (filters) {
            const cleaned: any = {};
            let hasData = false;
            Object.keys(filters).forEach(key => {
                if (Array.isArray(filters[key]) && filters[key].length > 0) {
                    cleaned[key] = filters[key];
                    hasData = true;
                }
            });
            if (hasData) filtersToSend = JSON.stringify(cleaned);
        }

        // CORRECCIÓN: Usar ruta relativa
        const response = await apiClient.get(`/Producto/empresa/${empresaId}`, {
            params: { page, pageSize, term, filters: filtersToSend }
        });
        return response.data;
    },

    // 2. Obtener catálogos para combos
    getFormDropdowns: async (): Promise<ApiResponse<any>> => {
        // CORRECCIÓN: Usar ruta relativa
        const response = await apiClient.get(`/Producto/form-dropdowns`);
        return response.data;
    },

    // 3. Crear (POST)
    create: async (data: Partial<Producto>): Promise<ApiResponse<Producto>> => {
        const response = await apiClient.post(`/Producto`, data);
        return response.data;
    },

    // 4. Actualizar (PUT)
    update: async (id: string | number, data: Partial<Producto>): Promise<ApiResponse<Producto>> => {
        const response = await apiClient.put(`/Producto/${id}`, data);
        return response.data;
    },

    // 5. Eliminar físicamente (DELETE)
    delete: async (id: string | number): Promise<ApiResponse<any>> => {
        const response = await apiClient.delete(`/Producto/${id}`);
        return response.data;
    },

    // 6. Anulación lógica (PATCH)
    anular: async (id: string | number): Promise<ApiResponse<any>> => {
        const response = await apiClient.patch(`/Producto/anular/${id}`);
        return response.data;
    }
};