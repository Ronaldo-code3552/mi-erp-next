import apiClient from '@/api/apiCliente';
import { ApiResponse } from '@/types';
import { ConversacionWhatsApp, EstadoConversacionWhatsApp } from '@/types/conversacionWhatsApp.types';

export const conversacionWhatsAppService = {
    getById: async (id: string): Promise<ApiResponse<ConversacionWhatsApp>> => {
        const response = await apiClient.get(`/ConversacionWhatsApp/${id}`);
        return response.data;
    },
    getBySender: async (
        senderWhatsappId: string,
        estado?: EstadoConversacionWhatsApp,
        page = 1,
        pageSize = 20
    ): Promise<ApiResponse<ConversacionWhatsApp[]>> => {
        const response = await apiClient.get(`/ConversacionWhatsApp/sender/${senderWhatsappId}`, {
            params: { estado: estado || undefined, page, pageSize }
        });
        return response.data;
    },
    cerrar: async (id: string): Promise<ApiResponse<ConversacionWhatsApp>> => {
        const response = await apiClient.patch(`/ConversacionWhatsApp/cerrar/${id}`);
        return response.data;
    }
};
