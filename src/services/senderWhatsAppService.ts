import apiClient from '@/api/apiCliente';
import { ApiResponse } from '@/types';
import {
    EstadoSenderWhatsApp,
    SenderWhatsApp,
    SenderWhatsAppCreatePayload,
    SenderWhatsAppUpdatePayload
} from '@/types/senderWhatsApp.types';

const getByCliente = async (
    clienteWhatsappId: string,
    page = 1,
    pageSize = 20,
    estado?: EstadoSenderWhatsApp
): Promise<ApiResponse<SenderWhatsApp[]>> => {
    const response = await apiClient.get(`/SenderWhatsApp/cliente/${clienteWhatsappId}`, {
        params: { page, pageSize, estado: estado || undefined }
    });
    return response.data;
};

export const senderWhatsAppService = {
    getById: async (id: string): Promise<ApiResponse<SenderWhatsApp>> => {
        const response = await apiClient.get(`/SenderWhatsApp/${id}`);
        return response.data;
    },
    getByCliente,
    getByEmpresa: async (
        clienteWhatsappId: string,
        page = 1,
        pageSize = 20,
        term = '',
        filters?: { estado?: EstadoSenderWhatsApp[] }
    ) => {
        void term;
        return getByCliente(clienteWhatsappId, page, pageSize, filters?.estado?.[0]);
    },
    create: async (payload: SenderWhatsAppCreatePayload): Promise<ApiResponse<SenderWhatsApp>> => {
        const response = await apiClient.post('/SenderWhatsApp', payload);
        return response.data;
    },
    update: async (id: string, payload: SenderWhatsAppUpdatePayload): Promise<ApiResponse<SenderWhatsApp>> => {
        const response = await apiClient.put(`/SenderWhatsApp/${id}`, payload);
        return response.data;
    },
    changeEstado: async (id: string, nuevoEstado: EstadoSenderWhatsApp): Promise<ApiResponse<SenderWhatsApp>> => {
        const response = await apiClient.patch(`/SenderWhatsApp/estado/${id}`, { nuevoEstado });
        return response.data;
    },
    delete: async (id: string): Promise<ApiResponse<string>> => {
        const response = await apiClient.delete(`/SenderWhatsApp/${id}`);
        return response.data;
    }
};
