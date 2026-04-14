// src/services/documentoCompraService.ts
import apiClient from '../api/apiCliente';
import { DocumentoCompra, DocumentoCompraFiltros } from '../types/documentoCompra.types'; // 🚀 Importamos la nueva interfaz
import { ApiResponse } from '../types';

// 🚀 Función auxiliar para no repetir código (D.R.Y.)
const buildFiltersString = (filtros: DocumentoCompraFiltros | null | undefined): string | null => {
    if (!filtros) return null;

    const cleaned: any = {};
    let hasData = false;

    Object.keys(filtros).forEach(key => {
        const value = (filtros as any)[key];
        if (value !== undefined && value !== null && value !== '') {
            if (Array.isArray(value)) {
                if (value.length > 0) {
                    cleaned[key] = value;
                    hasData = true;
                }
            } else {
                cleaned[key] = value;
                hasData = true;
            }
        }
    });

    return hasData ? JSON.stringify(cleaned) : null;
};

export const documentoCompraService = {
    
    // Método clásico
    getByEmpresa: async (
        empresaId: string,
        page = 1,
        pageSize = 20,
        term = '',
        filtros?: DocumentoCompraFiltros // 🚀 Tipado fuerte
    ): Promise<ApiResponse<DocumentoCompra[]>> => {
        
        const filtersToSend = buildFiltersString(filtros); // 🚀 Usamos la función auxiliar

        const response = await apiClient.get(`/DocumentoCompra/empresa/${empresaId}`, {
            params: { page, pageSize, search: term, filters: filtersToSend }
        });
        return response.data;
    },

    // 🚀 MÉTODO: Obtiene solo los disponibles
    getDisponiblesByEmpresa: async (
        empresaId: string,
        page: number = 1,
        pageSize: number = 20,
        searchTerm: string = '',
        filtros: DocumentoCompraFiltros | null = null, // 🚀 Tipado fuerte
        soloStock: boolean = false
    ): Promise<ApiResponse<any>> => {
        
        const filtersToSend = buildFiltersString(filtros); // 🚀 Usamos la función auxiliar

        const response = await apiClient.get(`/DocumentoCompra/empresa/${empresaId}/disponibles`, {
            params: { 
                page, 
                pageSize, 
                search: searchTerm, 
                filters: filtersToSend, // Viaja como String JSON puro ✅
                soloStock // Viaja como booleano puro ✅
            }
        });

        return response.data;
    },

    getById: async (id: string): Promise<ApiResponse<DocumentoCompra>> => {
        const safeId = id?.trim();
        if (!safeId) throw new Error('El ID del documento es requerido');
        const response = await apiClient.get(`/DocumentoCompra/${safeId}`);
        const payload = response.data;
        if (payload && typeof payload === 'object' && 'isSuccess' in payload) {
            return payload as ApiResponse<DocumentoCompra>;
        }
        return { isSuccess: true, data: payload?.data ?? payload, message: 'Éxito' };
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