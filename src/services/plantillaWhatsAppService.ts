import apiClient from '@/api/apiCliente';
import { ApiResponse } from '@/types';
import {
    CategoriaPlantillaWhatsApp,
    EstadoAprobacionPlantilla,
    PlantillaWhatsApp,
    PlantillaWhatsAppCreatePayload,
    PlantillaWhatsAppUpdatePayload
} from '@/types/plantillaWhatsApp.types';

export const plantillaWhatsAppService = {
    getById: async (id: string): Promise<ApiResponse<PlantillaWhatsApp>> => {
        const response = await apiClient.get(`/PlantillaWhatsApp/${id}`);
        return response.data;
    },
    getAll: async (
        page = 1,
        pageSize = 20,
        term = '',
        filters?: {
            clienteWhatsappId?: string;
            categoria?: CategoriaPlantillaWhatsApp[];
            estadoAprobacion?: EstadoAprobacionPlantilla[];
        }
    ): Promise<ApiResponse<PlantillaWhatsApp[]>> => {
        void term;
        const response = await apiClient.get('/PlantillaWhatsApp', {
            params: {
                clienteWhatsappId: filters?.clienteWhatsappId || undefined,
                categoria: filters?.categoria?.[0] || undefined,
                estadoAprobacion: filters?.estadoAprobacion?.[0] || undefined,
                page,
                pageSize
            }
        });
        return response.data;
    },
    getByEmpresa: async (
        clienteWhatsappId: string,
        page = 1,
        pageSize = 20,
        term = '',
        filters?: {
            categoria?: CategoriaPlantillaWhatsApp[];
            estadoAprobacion?: EstadoAprobacionPlantilla[];
        }
    ) => plantillaWhatsAppService.getAll(page, pageSize, term, { ...filters, clienteWhatsappId }),
    create: async (payload: PlantillaWhatsAppCreatePayload): Promise<ApiResponse<PlantillaWhatsApp>> => {
        const response = await apiClient.post('/PlantillaWhatsApp', payload);
        return response.data;
    },
    update: async (id: string, payload: PlantillaWhatsAppUpdatePayload): Promise<ApiResponse<PlantillaWhatsApp>> => {
        const response = await apiClient.put(`/PlantillaWhatsApp/${id}`, payload);
        return response.data;
    },
    changeEstadoAprobacion: async (
        id: string,
        estadoAprobacion: EstadoAprobacionPlantilla,
        nombreProveedor?: string
    ): Promise<ApiResponse<PlantillaWhatsApp>> => {
        const response = await apiClient.patch(`/PlantillaWhatsApp/estado-aprobacion/${id}`, {
            estadoAprobacion,
            nombreProveedor: nombreProveedor || undefined
        });
        return response.data;
    },
    delete: async (id: string): Promise<ApiResponse<string>> => {
        const response = await apiClient.delete(`/PlantillaWhatsApp/${id}`);
        return response.data;
    }
};
