// src/services/presentacionService.ts
import apiClient from '../api/apiCliente';
import { ApiResponse } from '../types';

export interface Presentacion {
    presentacionId?: string;
    bienId: string;
    descripcion: string;
    cantidad: number;
    unidadmedidaId: string;
    estado: boolean;
}

// 🚀 NUEVA INTERFAZ PARA LOS FILTROS
export interface PresentacionPorCantidadFiltros {
    Cantidad: number;
    SearchTerm?: string;
    Unidad?: string[];
    Estado?: string[];
}

export const presentacionService = {
    getByBien: async (bienId: string): Promise<ApiResponse<Presentacion[]>> => {
        const response = await apiClient.get(`/Presentaciones/bien/${bienId}`, {
            params: { page: 1, pageSize: 50 }
        });
        return response.data;
    },

    // 🚀 NUEVO MÉTODO PARA CONSUMIR EL ENDPOINT POR CANTIDAD
    getByCantidad: async (
        empresaId: string, 
        filtros: PresentacionPorCantidadFiltros, 
        page: number = 1, 
        pageSize: number = 20
    ): Promise<ApiResponse<Presentacion[]>> => {
        const response = await apiClient.get(`/Presentaciones/empresa/${empresaId}/por-cantidad`, {
            params: {
                page,
                pageSize,
                Cantidad: filtros.Cantidad, // Campo obligatorio
                SearchTerm: filtros.SearchTerm,
                Unidad: filtros.Unidad,
                Estado: filtros.Estado
            }
        });
        return response.data;
    },

    create: async (data: Presentacion) => {
        return (await apiClient.post('/Presentaciones', data)).data;
    },

    update: async (id: string, data: Presentacion) => {
        return (await apiClient.put(`/Presentaciones/${id}`, data)).data;
    },
    
    delete: async (id: string): Promise<ApiResponse<any>> => {
        const response = await apiClient.delete(`/Presentaciones/${id}`);
        return response.data;
    }
};