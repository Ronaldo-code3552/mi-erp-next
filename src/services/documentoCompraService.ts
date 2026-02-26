// src/services/documentoCompraService.ts
import apiClient from '../api/apiCliente';
import { DocumentoCompra } from '../types/documentoCompra.types';
import { ApiResponse } from '../types';

export const documentoCompraService = {
    /**
     * Obtiene los documentos de compra paginados y filtrados.
     */
    getByEmpresa: async (
        empresaId: string,
        page = 1,
        pageSize = 20,
        term = '',
        filters: any = null
    ): Promise<ApiResponse<DocumentoCompra[]>> => {
        let filtersToSend = null;

        if (filters) {
            const cleaned: any = {};
            let hasData = false;

            // Limpieza y preparación del JSON de filtros para el SP de C#
            Object.keys(filters).forEach((key) => {
                const value = filters[key];

                // Si es un arreglo (ej: tipo_documento: ["01", "03"])
                if (Array.isArray(value) && value.length > 0) {
                    cleaned[key] = value;
                    hasData = true;
                }
                // Si es un string normal (ej: fecha_inicio: "2025-01-01")
                else if (typeof value === 'string' && value.trim() !== '') {
                    cleaned[key] = value;
                    hasData = true;
                }
                // Si es un número o boolean
                else if (typeof value === 'number' || typeof value === 'boolean') {
                    cleaned[key] = value;
                    hasData = true;
                }
            });

            if (hasData) filtersToSend = JSON.stringify(cleaned);
        }

        // Nota: usamos "search: term" para que coincida con [FromQuery] search en C#
        const response = await apiClient.get(`/DocumentoCompra/empresa/${empresaId}`, {
            params: {
                page,
                pageSize,
                search: term,
                filters: filtersToSend
            }
        });

        return response.data;
    },

    /**
     * Obtiene un documento de compra por ID.
     * Soporta respuestas envueltas ({ data }) y respuestas directas.
     */
    getById: async (id: string): Promise<ApiResponse<DocumentoCompra>> => {
        const safeId = id?.trim();
        if (!safeId) {
            throw new Error('El ID del documento de compra es requerido');
        }

        const response = await apiClient.get(`/DocumentoCompra/${safeId}`);
        const payload = response.data;

        if (payload && typeof payload === 'object' && 'isSuccess' in payload) {
            return payload as ApiResponse<DocumentoCompra>;
        }

        return {
            isSuccess: true,
            data: payload?.data ?? payload,
            message: 'Éxito'
        };
    },

    create: async (data: Partial<DocumentoCompra>): Promise<ApiResponse<DocumentoCompra>> => {
        const response = await apiClient.post(`/DocumentoCompra`, data);
        return response.data;
    },

    update: async (id: string, data: Partial<DocumentoCompra>): Promise<ApiResponse<DocumentoCompra>> => {
        const response = await apiClient.put(`/DocumentoCompra/${id}`, data);
        return response.data;
    },

    delete: async (id: string): Promise<ApiResponse<any>> => {
        const response = await apiClient.delete(`/DocumentoCompra/${id}`);
        return response.data;
    }
};
