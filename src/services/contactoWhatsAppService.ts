import apiClient from '@/api/apiCliente';
import { ApiResponse } from '@/types';
import {
    ContactoWhatsApp,
    ContactoWhatsAppCreatePayload,
    ContactoWhatsAppUpdatePayload
} from '@/types/contactoWhatsApp.types';

const getByCliente = async (
    clienteWhatsappId: string,
    page = 1,
    pageSize = 20,
    term = '',
    optIn?: boolean
): Promise<ApiResponse<ContactoWhatsApp[]>> => {
    const response = await apiClient.get(`/ContactoWhatsApp/cliente/${clienteWhatsappId}`, {
        params: { page, pageSize, term: term || undefined, optIn }
    });
    return response.data;
};

export const contactoWhatsAppService = {
    getById: async (id: string): Promise<ApiResponse<ContactoWhatsApp>> => {
        const response = await apiClient.get(`/ContactoWhatsApp/${id}`);
        return response.data;
    },
    getByCliente,
    getByEmpresa: async (
        clienteWhatsappId: string,
        page = 1,
        pageSize = 20,
        term = '',
        filters?: { optIn?: Array<boolean | string | number> }
    ) => {
        const raw = filters?.optIn?.[0];
        const optIn = raw === undefined ? undefined : raw === true || raw === 1 || raw === '1' || raw === 'true';
        return getByCliente(clienteWhatsappId, page, pageSize, term, optIn);
    },
    create: async (payload: ContactoWhatsAppCreatePayload): Promise<ApiResponse<ContactoWhatsApp>> => {
        const response = await apiClient.post('/ContactoWhatsApp', payload);
        return response.data;
    },
    update: async (id: string, payload: ContactoWhatsAppUpdatePayload): Promise<ApiResponse<ContactoWhatsApp>> => {
        const response = await apiClient.put(`/ContactoWhatsApp/${id}`, payload);
        return response.data;
    },
    anular: async (id: string): Promise<ApiResponse<ContactoWhatsApp>> => {
        const response = await apiClient.patch(`/ContactoWhatsApp/anular/${id}`);
        return response.data;
    },
    delete: async (id: string): Promise<ApiResponse<string>> => {
        const response = await apiClient.delete(`/ContactoWhatsApp/${id}`);
        return response.data;
    }
};
