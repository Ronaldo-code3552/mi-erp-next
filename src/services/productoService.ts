// src/services/productoService.ts
import apiClient from '../api/apiCliente'; // Importa nuestro cliente configurado
import { Producto } from '../types/producto.types';
import { ApiResponse } from '../types';
const API_URL = process.env.NEXT_PUBLIC_API_URL;

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

        const response = await apiClient.get(`${API_URL}/Producto/empresa/${empresaId}`, {
            params: { page, pageSize, term, filters: filtersToSend }
        });
        return response.data;
    },

    // 2. Obtener catálogos para combos
    getFormDropdowns: async (): Promise<ApiResponse<any>> => {
        const response = await apiClient.get(`${API_URL}/Producto/form-dropdowns`);
        return response.data;
    },

    // 3. Crear (POST)
    create: async (data: Partial<Producto>): Promise<ApiResponse<Producto>> => {
        const response = await apiClient.post(`${API_URL}/Producto`, data);
        return response.data;
    },

    // 4. Actualizar (PUT)
    update: async (id: string | number, data: Partial<Producto>): Promise<ApiResponse<Producto>> => {
        const response = await apiClient.put(`${API_URL}/Producto/${id}`, data);
        return response.data;
    },

    // 5. Eliminar físicamente (DELETE)
    delete: async (id: string | number): Promise<ApiResponse<any>> => {
        const response = await apiClient.delete(`${API_URL}/Producto/${id}`);
        return response.data;
    },

    // 6. Anulación lógica (PATCH)
    anular: async (id: string | number): Promise<ApiResponse<any>> => {
        const response = await apiClient.patch(`${API_URL}/Producto/anular/${id}`);
        return response.data;
    }
};