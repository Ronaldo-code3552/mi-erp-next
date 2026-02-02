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

export const presentacionService = {
    getByBien: async (bienId: string): Promise<ApiResponse<Presentacion[]>> => {
        const response = await apiClient.get(`/Presentaciones/bien/${bienId}`, {
            params: { page: 1, pageSize: 50 }
        });
        return response.data;
    },

    create: async (data: Presentacion) => {
        return (await apiClient.post('/Presentaciones', data)).data;
    },

    update: async (id: string, data: Presentacion) => {
        return (await apiClient.put(`/Presentaciones/${id}`, data)).data;
    },

    getFormDropdowns: async () => {
        return (await apiClient.get('/Presentaciones/form-dropdowns')).data;
    }
};