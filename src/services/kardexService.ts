// src/services/kardexService.ts
import apiClient from '../api/apiCliente';
import { ApiResponse } from '../types';
import { 
    KardexFilterRequest, 
    MovimientoInventarioDto, 
    SaldosKardexDto,
    KardexEmpresaResponse 
} from '../types/kardex.types';

export const kardexService = {
    // SECCIÓN 1: Kardex por Presentación
    getMovimientos: async (filter: KardexFilterRequest): Promise<ApiResponse<MovimientoInventarioDto[]>> => {
        const response = await apiClient.post('/MovimientoKardex/kardex/presentacion', filter);
        return response.data;
    },

    getSaldos: async (filter: KardexFilterRequest): Promise<ApiResponse<SaldosKardexDto>> => {
        const response = await apiClient.post('/MovimientoKardex/kardex/presentacion-saldos', filter);
        return response.data;
    },

    exportarPresentacion: async (filter: KardexFilterRequest) => {
        const response = await apiClient.post('/MovimientoKardex/kardex/exportar-presentacion', filter, {
            responseType: 'blob'
        });
        return response.data; // Retorna el blob para descarga
    },

    // SECCIÓN 3: Kardex por Empresa
    getKardexEmpresa: async (filter: any): Promise<ApiResponse<KardexEmpresaResponse>> => {
        const response = await apiClient.post('/MovimientoKardex/kardex/empresa', filter);
        return response.data;
    },
    exportarEmpresa: async (filter: any) => {
        const response = await apiClient.post('/MovimientoKardex/kardex/exportar-empresa', filter, {
            responseType: 'blob'
        });
        return response.data;
    },

    getSaldosEmpresa: async (filter: any): Promise<ApiResponse<{ saldoReal: number, saldoDisponible: number, saldoFuturo: number }>> => {
        const response = await apiClient.post('/MovimientoKardex/kardex/empresa-saldos', filter);
        return response.data;
    }
};