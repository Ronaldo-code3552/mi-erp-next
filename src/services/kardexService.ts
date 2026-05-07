// src/services/kardexService.ts
import apiClient from '../api/apiCliente';
import { ApiResponse } from '../types';
import { 
    KardexFilterRequest, 
    MovimientoInventarioDto, 
    SaldosKardexDto,
    KardexEmpresaRequest,
    KardexEmpresaResponse 
} from '../types/kardex.types';

const buildQueryParams = <T extends object>(filter: T) => {
    return Object.fromEntries(
        Object.entries(filter).filter(([, value]) => value !== undefined && value !== null && value !== '')
    );
};

export const kardexService = {
    // SECCIÓN 1: Kardex por Presentación
    getMovimientos: async (filter: KardexFilterRequest): Promise<ApiResponse<MovimientoInventarioDto[]>> => {
        const response = await apiClient.get('/MovimientoKardex/kardex/presentacion', {
            params: buildQueryParams(filter)
        });
        return response.data;
    },

    getSaldos: async (filter: KardexFilterRequest): Promise<ApiResponse<SaldosKardexDto>> => {
        const response = await apiClient.get('/MovimientoKardex/kardex/presentacion-saldos', {
            params: buildQueryParams(filter)
        });
        return response.data;
    },

    exportarPresentacion: async (filter: KardexFilterRequest) => {
        const response = await apiClient.post('/MovimientoKardex/kardex/exportar-presentacion', filter, {
            responseType: 'blob'
        });
        return response.data; // Retorna el blob para descarga
    },

    // SECCIÓN 3: Kardex por Empresa
    getKardexEmpresa: async (filter: KardexEmpresaRequest): Promise<ApiResponse<KardexEmpresaResponse>> => {
        const response = await apiClient.get('/MovimientoKardex/kardex/empresa', {
            params: buildQueryParams(filter)
        });
        return response.data;
    },
    exportarEmpresa: async (filter: KardexEmpresaRequest) => {
        const response = await apiClient.post('/MovimientoKardex/kardex/exportar-empresa', filter, {
            responseType: 'blob'
        });
        return response.data;
    },

    getSaldosEmpresa: async (filter: KardexEmpresaRequest): Promise<ApiResponse<{ saldoReal: number, saldoDisponible: number, saldoFuturo: number }>> => {
        const response = await apiClient.get('/MovimientoKardex/kardex/empresa-saldos', {
            params: buildQueryParams(filter)
        });
        return response.data;
    }
};
