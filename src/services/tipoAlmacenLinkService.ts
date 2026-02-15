// src/services/tipoAlmacenLinkService.ts
import apiClient from '../api/apiCliente';
import { ApiResponse } from '@/types';
import { 
    TipoAlmacenLink, 
    TipoAlmacenLinkInsertRequest, 
    TipoAlmacenLinkUpdateRequest 
} from '../types/tipoAlmacenLink.types';

export const tipoAlmacenLinkService = {
    // 1. OBTENER (CORREGIDO): Extrae la lista desde el endpoint de detalle principal
    getByTransaction: async (transaccionId: string): Promise<ApiResponse<TipoAlmacenLink[]>> => {
        try {
            // Llamamos al endpoint que SÍ existe y trae toda la info
            const response = await apiClient.get(`/TablaTransacciones/detalle/${transaccionId}`);
            
            // Verificamos si la respuesta fue exitosa
            if (response.data.isSuccess && response.data.data) {
                // Extraemos SOLO la lista de almacenes del objeto principal
                const lista = response.data.data.ListaAlmacenes || [];
                
                // Devolvemos una estructura ApiResponse falsa pero compatible con el componente
                return {
                    isSuccess: true,
                    message: "Éxito",
                    data: lista, // Aquí va el array que necesita la tabla
                    status: 200
                };
            }
            
            return { isSuccess: false, message: "No se encontraron datos", data: [] };

        } catch (error) {
            console.error(error);
            return { isSuccess: false, message: "Error al obtener almacenes", data: [] };
        }
    },

    // 2. Insertar (Se mantiene igual, va al endpoint específico de links)
    create: async (data: TipoAlmacenLinkInsertRequest): Promise<ApiResponse<string>> => {
        const response = await apiClient.post(`/TipoAlmacenTablaTransacciones`, data);
        return response.data;
    },

    // 3. Actualizar (Se mantiene igual)
    update: async (data: TipoAlmacenLinkUpdateRequest): Promise<ApiResponse<string>> => {
        const response = await apiClient.put(`/TipoAlmacenTablaTransacciones`, data);
        return response.data;
    },

    // 4. Eliminar (Se mantiene igual)
    delete: async (transaccionId: string, tipoalmacenId: number): Promise<ApiResponse<string>> => {
        const response = await apiClient.delete(`/TipoAlmacenTablaTransacciones/${transaccionId}/${tipoalmacenId}`);
        return response.data;
    }
};