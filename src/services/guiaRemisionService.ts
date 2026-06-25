// src/services/guiaRemisionService.ts
import apiClient from '../api/apiCliente';
import { GuiaRemisionPayload, GuiaRemisionResponse, GuiaRemisionFiltros } from '../types/guiaRemision.types'; // 🚀 Importamos GuiaRemisionFiltros
import { ApiResponse } from '../types';

// 🚀 FUNCIÓN CENTRALIZADA PARA SERIALIZAR FILTROS
const buildFiltersString = (filtros: GuiaRemisionFiltros | null | undefined): string | null => {
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

export const guiaRemisionService = {

    // 1. Obtener listado paginado
    getByEmpresa: async (
        empresaId: string, 
        page = 1, 
        pageSize = 20, 
        term = "", 
        filtros?: GuiaRemisionFiltros // 🚀 Tipado Fuerte y parámetro opcional
    ): Promise<ApiResponse<GuiaRemisionResponse[]>> => {
        
        // 🚀 Usamos la función auxiliar
        const filtersToSend = buildFiltersString(filtros);

        const response = await apiClient.get(`/GuiaRemision/empresa/${empresaId}`, {
            params: { page, pageSize, term, filters: filtersToSend }
        });
        return response.data;
    },

    // 2. Obtener solo los disponibles
    getDisponiblesByEmpresa: async (
        empresaId: string, 
        page = 1, 
        pageSize = 20, 
        searchTerm = "", // Cambié 'term' a 'searchTerm' para estandarizar
        filtros: GuiaRemisionFiltros | null = null, // 🚀 Tipado Fuerte
        soloStock: boolean = false,
        tipoOperacion: string | null = null
    ): Promise<ApiResponse<GuiaRemisionResponse[]>> => {
        
        // 🚀 Usamos la función auxiliar (¡Adiós a la lógica repetida!)
        const filtersToSend = buildFiltersString(filtros);

        // Llamamos a la ruta /disponibles
        const response = await apiClient.get(`/GuiaRemision/empresa/${empresaId}/disponibles`, {
            params: { 
                page, 
                pageSize, 
                term: searchTerm,
                filters: filtersToSend,
                tipoOperacion,
                soloStock
            }
        });
        return response.data;
    },

    // 🚀 Obtener el correlativo dinámico y seguro
    getSiguienteCorrelativo: async (tipoDocId: string, serie: string): Promise<ApiResponse<{ correlativo: string }>> => {
        const response = await apiClient.get(`/GuiaRemision/siguiente-correlativo`, {
            params: { tipoDocId, serie }
        });
        return response.data;
    },

    // 3. Obtener por ID (Para Editar / Importar)
    getById: async (id: string): Promise<ApiResponse<GuiaRemisionResponse>> => {
        const response = await apiClient.get(`/GuiaRemision/${id}`);
        return response.data;
    },

    // 4. Crear (Solo guardar)
    create: async (data: GuiaRemisionPayload): Promise<ApiResponse<any>> => {
        const response = await apiClient.post('/GuiaRemision', data);
        return response.data;
    },

    // 5. Crear y Validar SUNAT (SaveValidar)
    createAndValidate: async (data: GuiaRemisionPayload): Promise<ApiResponse<any>> => {
        const response = await apiClient.post('/GuiaRemision/savevalidar', data);
        return response.data;
    },

    // 6. Validar ID existente en SUNAT
    validarSunatId: async (guiaId: string): Promise<ApiResponse<{ respuestaSunat: string }>> => {
        const response = await apiClient.post('/GuiaRemision/validarId', null, {
            params: { guiaRemisionId: guiaId }
        });
        return response.data;
    },

    // 7. Anular
    anular: async (id: string): Promise<ApiResponse<any>> => {
        const response = await apiClient.patch(`/GuiaRemision/anular/${id}`);
        return response.data;
    },
    
    // 8. Imprimir PDF
    imprimir: async (id: string): Promise<ApiResponse<any>> => {
        const response = await apiClient.get(`/GuiaRemision/${id}/imprimir`);
        return response.data;
    },

    // 9. Eliminar (Físico)
    delete: async (id: string): Promise<ApiResponse<any>> => {
        const response = await apiClient.delete(`/GuiaRemision/${id}`);
        return response.data;
    }
};
