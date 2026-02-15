import apiClient from '../api/apiCliente';
import { ApiResponse } from '@/types';

export interface Modelo {
    modeloId: number;
    marcaId: number;
    descripcion: string;
    estado: boolean;
}

export const modeloService = {
    getByMarca: async (marcaId: number): Promise<ApiResponse<Modelo[]>> => {
        const response = await apiClient.get(`/Modelo?size=1000&estado=1&marca=${marcaId}`);
        return response.data;
    },
    create: async (data: { marcaId: number, descripcion: string, estado: boolean }) => {
        const response = await apiClient.post(`/Modelo`, data);
        return response.data;
    },
    update: async (id: number, data: { marcaId: number, descripcion: string, estado: boolean }) => {
        const response = await apiClient.put(`/Modelo/${id}`, data);
        return response.data;
    },
    delete: async (id: number) => {
        const response = await apiClient.delete(`/Modelo/${id}`);
        return response.data;
    }
};