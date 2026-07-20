import apiClient from '@/api/apiCliente';
import { ApiResponse } from '@/types';
import { Ubigeo, UbigeoCascadeParams } from '@/types/ubigeo.types';

export const ubigeoService = {
    getCascade: async (params: UbigeoCascadeParams): Promise<ApiResponse<Ubigeo[]>> => {
        const response = await apiClient.get('/Ubigeo', { params });
        return response.data;
    }
};
