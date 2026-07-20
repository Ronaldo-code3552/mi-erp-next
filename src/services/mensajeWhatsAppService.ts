import apiClient from '@/api/apiCliente';
import { ApiResponse } from '@/types';
import {
    EnviarMensajeWhatsAppPayload,
    EnviarMensajeWhatsAppResponse,
    EventoEstadoMensajeWhatsApp,
    MensajeWhatsApp,
    MensajeWhatsAppLogFilters
} from '@/types/mensajeWhatsApp.types';

export const mensajeWhatsAppService = {
    enviar: async (payload: EnviarMensajeWhatsAppPayload): Promise<ApiResponse<EnviarMensajeWhatsAppResponse>> => {
        const response = await apiClient.post('/MensajeWhatsApp/enviar', payload);
        return response.data;
    },
    getById: async (id: string): Promise<ApiResponse<MensajeWhatsApp>> => {
        const response = await apiClient.get(`/MensajeWhatsApp/${id}`);
        return response.data;
    },
    getByConversacion: async (
        conversacionWhatsappId: string,
        page = 1,
        pageSize = 50
    ): Promise<ApiResponse<MensajeWhatsApp[]>> => {
        const response = await apiClient.get(`/MensajeWhatsApp/conversacion/${conversacionWhatsappId}`, {
            params: { page, pageSize }
        });
        return response.data;
    },
    getByCliente: async (
        clienteWhatsappId: string,
        page = 1,
        pageSize = 20,
        filters: MensajeWhatsAppLogFilters = {}
    ): Promise<ApiResponse<MensajeWhatsApp[]>> => {
        const response = await apiClient.get(`/MensajeWhatsApp/cliente/${clienteWhatsappId}`, {
            params: {
                senderWhatsappId: filters.senderWhatsappId || undefined,
                estado: filters.estado || undefined,
                direccion: filters.direccion || undefined,
                fechaDesde: filters.fechaDesde || undefined,
                fechaHasta: filters.fechaHasta || undefined,
                page,
                pageSize
            }
        });
        return response.data;
    },
    getEventosEstado: async (id: string): Promise<ApiResponse<EventoEstadoMensajeWhatsApp[]>> => {
        const response = await apiClient.get(`/MensajeWhatsApp/${id}/eventos-estado`);
        return response.data;
    }
};
