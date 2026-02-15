import apiClient from '../api/apiCliente';
import { ApiResponse } from '@/types';

export interface Marca {
    marcaId: number;
    descripcion: string;
    estado: boolean;
}

export const marcaService = {
    getAll: async (): Promise<ApiResponse<Marca[]>> => {
        // Asumiendo que usas el endpoint de listado general
        const response = await apiClient.get(`/Marca?size=1000&estado=1`); 
        return response.data;
    },
    create: async (data: { descripcion: string, estado: boolean }) => {
        const response = await apiClient.post(`/Marca`, data);
        return response.data;
    },
    update: async (id: number, data: { descripcion: string, estado: boolean }) => {
        const response = await apiClient.put(`/Marca/${id}`, data);
        return response.data;
    },
    delete: async (id: number) => {
        const response = await apiClient.delete(`/Marca/${id}`);
        return response.data;
    }
};