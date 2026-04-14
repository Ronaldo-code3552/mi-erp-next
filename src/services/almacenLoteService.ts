// src/services/almacenLoteService.ts
import apiClient from '../api/apiCliente';
import { ApiResponse } from '../types';

export interface LoteDetalleRequest {
    presentacionId: string;
    almacenId: string;
    cantidad_lote_stock: number;
}

export interface LoteSaveRequest {
    descripcion?: string;
    fecha_produccion: string;
    fecha_vencimiento: string;
    fecha_alerta: string;
    empresaId: string;
    codigo_lote_importacion?: string;
    detalles: LoteDetalleRequest[];
}

export const almacenLoteService = {
    /**
     * Trae un lote específico con toda su información relacionada.
     */
    getById: async (loteId: string): Promise<ApiResponse<any>> => {
        const response = await apiClient.get(`/AlmacenLote/${loteId}`);
        return response.data;
    },

    /**
     * Lista todos los lotes de una empresa (Paginado)
     */
    getByEmpresa: async (empresaId: string, page = 1, pageSize = 20): Promise<ApiResponse<any[]>> => {
        const response = await apiClient.get(`/AlmacenLote/empresa/${empresaId}`, {
            params: { page, pageSize }
        });
        return response.data;
    },

    /**
     * Obtiene los lotes filtrados por Almacén, Presentación y Tipo (NI/NS)
     * Reemplaza la llamada dinámica que hacíamos en catalogService.
     */
    getByAlmacenYPresentacion: async (
        almacenId: string, 
        presentacionId: string, 
        page = 1, 
        pageSize = 20,
        filtros?: { Tipo?: string; SearchTerm?: string }
    ): Promise<ApiResponse<any[]>> => {
        const response = await apiClient.get(`/AlmacenLote/almacen/${almacenId}/presentacion/${presentacionId}`, {
            params: { 
                page, 
                pageSize,
                ...filtros
            }
        });
        return response.data;
    },

    /**
     * Inserta un nuevo Lote y sus detalles.
     */
    create: async (data: LoteSaveRequest): Promise<ApiResponse<{ loteId: string }>> => {
        const response = await apiClient.post('/AlmacenLote', data);
        return response.data;
    },

    /**
     * Actualiza cabecera y reemplaza detalles de un Lote.
     */
    update: async (loteId: string, nuevoEstado: string, data: LoteSaveRequest): Promise<ApiResponse<any>> => {
        const response = await apiClient.put(`/AlmacenLote/${loteId}/${nuevoEstado}`, data);
        return response.data;
    },

    /**
     * Elimina físicamente el lote (Si no tiene movimientos).
     */
    delete: async (loteId: string): Promise<ApiResponse<any>> => {
        const response = await apiClient.delete(`/AlmacenLote/${loteId}`);
        return response.data;
    },

    /**
     * Cambia el estado del lote a 'Anulado'.
     */
    anular: async (loteId: string): Promise<ApiResponse<any>> => {
        const response = await apiClient.patch(`/AlmacenLote/anular/${loteId}`);
        return response.data;
    }
};