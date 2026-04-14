// src/services/notaSalidaService.ts
import apiClient from '../api/apiCliente';
import { NotaSalidaPayload, NotaSalidaResponse } from '../types/notaSalida.types';
import { ApiResponse } from '../types';

export const notaSalidaService = {
    /**
     * Obtiene el listado de Notas de Salida.
     * 🚀 IMPORTANTE: El backend espera un POST con el Body (Filtros) y el Query (Paginación)
     */
    getByAlmacen: async (
        almacenId: string,
        page = 1,
        pageSize = 20,
        term = '',
        filters: any = null
    ): Promise<ApiResponse<NotaSalidaResponse[]>> => {
        
        // Armamos el Payload que mapea exactamente con la clase 'NotaSalidaByAlmacen' de C#
        const payload = {
            almacenId: almacenId,
            SearchTerm: term || null,
            FechaIncio: filters?.fecha_inicio || null, // 🚀 Mapeado al typo exacto del backend
            FechaFin: filters?.fecha_fin || null,
            estados: filters?.estadoJson?.length ? filters.estadoJson : null,
            Filtro_Transaccion: filters?.transaccionJson?.length ? filters.transaccionJson : null,
            Filtro_TipoDocumentoComercial: filters?.tipocomercialJson?.length ? filters.tipocomercialJson : null,
            Filtro_CuentaUsuario: filters?.usuarioJson?.length ? filters.usuarioJson : null,
        };

        const response = await apiClient.post(`/NotaSalida/listar-almacen`, payload, {
            params: {
                page,
                pageSize
            }
        });

        return response.data;
    },

    /**
     * Obtiene el detalle profundo de una Nota de Salida
     */
    getById: async (id: string): Promise<ApiResponse<NotaSalidaResponse>> => {
        const response = await apiClient.get(`/NotaSalida/detalle/${id}`);
        return response.data;
    },

    /**
     * Inserta una nueva Nota de Salida con sus detalles
     */
    create: async (data: Partial<NotaSalidaPayload>): Promise<ApiResponse<any>> => {
        const response = await apiClient.post('/NotaSalida', data);
        return response.data;
    },

    /**
     * Anula una nota de salida. 
     * 🚀 NOTA: El backend recibe 'cuentausuarioId' pero internamente el SP evalúa '@empresaId'.
     * Pasamos el ID de la empresa como parámetro.
     */
    anular: async (notassalidaId: string, empresaId: string): Promise<ApiResponse<any>> => {
        const response = await apiClient.patch(`/NotaSalida/anular/${notassalidaId}`, null, {
            params: {
                cuentausuarioId: empresaId
            }
        });
        return response.data;
    },

    /**
     * Genera la impresión de la Nota de Salida (Asumiendo que crearás este endpoint luego)
     */
    imprimir: async (id: string): Promise<ApiResponse<any>> => {
        const response = await apiClient.get(`/NotaSalida/${id}/imprimir`);
        return response.data;
    }
};