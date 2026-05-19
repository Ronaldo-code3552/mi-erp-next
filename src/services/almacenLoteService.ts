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
    detalles?: LoteDetalleRequest[];
}

export interface LoteEmpresaFilters {
    estadoJson?: string[];
    estados_excluidos?: string[];
    almacenJson?: string[];
    presentacionJson?: string[];
    bienJson?: string[];
    sedeJson?: string[];
    tipoAlmacenJson?: string[];
    condicionEstadoBienJson?: string[];
    fecha_registro_inicio?: string;
    fecha_registro_fin?: string;
    fecha_produccion_inicio?: string;
    fecha_produccion_fin?: string;
    fecha_vencimiento_inicio?: string;
    fecha_vencimiento_fin?: string;
    fecha_alerta_inicio?: string;
    fecha_alerta_fin?: string;
}

export type AlmacenLoteResponse = Record<string, unknown>;

export interface StockPresentacionResponse {
    almacenId: string;
    bienId: string;
    presentacionId: string;
    stock_real_pres: number;
    stock_disponible_pres: number;
    stock_futura_pres: number;
    saldo_manual_consultado: number;
}

export const almacenLoteService = {
    /**
     * Trae un lote específico con toda su información relacionada.
     */
    getById: async (loteId: string): Promise<ApiResponse<AlmacenLoteResponse>> => {
        const response = await apiClient.get(`/AlmacenLote/${loteId}`);
        return response.data;
    },

    /**
     * Lista todos los lotes de una empresa (Paginado)
     */
    getByEmpresa: async (
        empresaId: string,
        page = 1,
        pageSize = 20,
        term = "",
        filters?: LoteEmpresaFilters,
        soloConDetalle = false,
        soloConStock = false
    ): Promise<ApiResponse<AlmacenLoteResponse[]>> => {
        const filtersToSend = filters && Object.values(filters).some((value) => {
            if (Array.isArray(value)) return value.length > 0;
            return Boolean(value);
        }) ? JSON.stringify(filters) : undefined;

        const response = await apiClient.get(`/AlmacenLote/empresa/${empresaId}`, {
            params: {
                page,
                pageSize,
                term,
                filters: filtersToSend,
                soloConDetalle,
                soloConStock
            }
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
    ): Promise<ApiResponse<AlmacenLoteResponse[]>> => {
        const response = await apiClient.get(`/AlmacenLote/almacen/${almacenId}/presentacion/${presentacionId}`, {
            params: { 
                page, 
                pageSize,
                ...filtros
            }
        });
        return response.data;
    },

    getStockPresentacion: async (almacenId: string, presentacionId: string): Promise<ApiResponse<StockPresentacionResponse[]>> => {
        const response = await apiClient.get('/Almacen/stock-presentacion', {
            params: {
                almacenId,
                presentacionId
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
    update: async (loteId: string, nuevoEstado: string, data: LoteSaveRequest): Promise<ApiResponse<AlmacenLoteResponse>> => {
        const response = await apiClient.put(`/AlmacenLote/${loteId}/${nuevoEstado}`, data);
        return response.data;
    },

    /**
     * Elimina físicamente el lote (Si no tiene movimientos).
     */
    delete: async (loteId: string): Promise<ApiResponse<AlmacenLoteResponse>> => {
        const response = await apiClient.delete(`/AlmacenLote/${loteId}`);
        return response.data;
    },

    /**
     * Cambia el estado del lote a 'Anulado'.
     */
    anular: async (loteId: string): Promise<ApiResponse<AlmacenLoteResponse>> => {
        const response = await apiClient.patch(`/AlmacenLote/anular/${loteId}`);
        return response.data;
    }
};
