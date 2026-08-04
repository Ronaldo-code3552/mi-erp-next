import apiClient from '@/api/apiCliente';
import { ApiResponse } from '@/types';
import {
    Proveedor,
    ProveedorCreatePayload,
    ProveedorFilters,
    ProveedorPayload,
    ProveedorUpdatePayload
} from '@/types/proveedor.types';
import { TENANT_ID } from '@/config/appConfig';

const getErrorMessage = (error: unknown, fallback: string) => {
    if (typeof error === 'object' && error !== null) {
        const response = (error as { response?: { data?: { message?: unknown } } }).response;
        const message = response?.data?.message;

        if (typeof message === 'string' && message.trim() !== '') {
            return message;
        }
    }

    if (error instanceof Error && error.message) {
        return error.message;
    }

    return fallback;
};

const buildCsv = (value?: Array<string | number>) => {
    if (!Array.isArray(value) || value.length === 0) return null;

    const clean = value.map(item => String(item ?? '').trim()).filter(Boolean);
    return clean.length ? clean.join(',') : null;
};

const buildEstadoFilter = (value?: Array<string | number>) => {
    if (!Array.isArray(value) || value.length !== 1) return null;

    const selected = String(value[0]).trim().toLowerCase();

    if (selected === '1' || selected === 'true') return true;
    if (selected === '0' || selected === 'false') return false;

    return null;
};

const normalizeMeta = (
    meta: ApiResponse<unknown>['meta'],
    page: number,
    pageSize: number
) => ({
    totalRecords: Number(meta?.totalRecords ?? meta?.TotalRecords ?? 0),
    totalPages: Number(meta?.totalPages ?? meta?.TotalPages ?? 1),
    currentPage: Number(meta?.currentPage ?? meta?.CurrentPage ?? page),
    pageSize: Number(meta?.pageSize ?? meta?.PageSize ?? pageSize)
});

const toCreatePayload = (payload: ProveedorPayload): ProveedorCreatePayload => ({
    ProveedorId: payload.proveedorId,
    TipoproveedorId: payload.tipoproveedorId,
    ClaseproveedorId: payload.claseproveedorId ? Number(payload.claseproveedorId) : null,
    Descripcion: payload.descripcion,
    DocidentId: payload.docidentId,
    NumeroDoc: payload.numeroDoc,
    Direccion: payload.direccion,
    TelefonoFijo: payload.telefonoFijo,
    TelefonoFijo2: payload.telefonoFijo2,
    TelefonoMovil: payload.telefonoMovil,
    TelefonoMovil2: payload.telefonoMovil2,
    FechaNacimiento: payload.fechaNacimiento || null,
    Email: payload.email,
    Website: payload.website,
    Estado: payload.estado ?? true,
    Ubidst: payload.ubidst
});

const toUpdatePayload = (payload: ProveedorPayload): ProveedorUpdatePayload => ({
    ClaseproveedorId: payload.claseproveedorId ? Number(payload.claseproveedorId) : null,
    Direccion: payload.direccion,
    TelefonoFijo: payload.telefonoFijo,
    TelefonoFijo2: payload.telefonoFijo2,
    TelefonoMovil: payload.telefonoMovil,
    TelefonoMovil2: payload.telefonoMovil2,
    FechaNacimiento: payload.fechaNacimiento || null,
    Email: payload.email,
    Website: payload.website,
    Ubidst: payload.ubidst
});

export const proveedorService = {
    getAll: async (
        page = 1,
        pageSize = 20,
        term = '',
        filters: ProveedorFilters = {}
    ): Promise<ApiResponse<Proveedor[]>> => {
        try {
            const params: Record<string, string | number> = {
                PageNumber: page,
                PageSize: pageSize
            };

            if (term.trim()) params.SearchTerm = term.trim();

            const estado = buildEstadoFilter(filters.estado);
            const docidentId = buildCsv(filters.docidentId);
            const tipoproveedorId = buildCsv(filters.tipoproveedorId);
            const claseproveedorId = buildCsv(filters.claseproveedorId);

            if (estado !== null) params.Estado = String(estado);
            if (docidentId) params.DocidentIds = docidentId;
            if (tipoproveedorId) params.TipoproveedorIds = tipoproveedorId;
            if (claseproveedorId) params.ClaseproveedorIds = claseproveedorId;

            const response = await apiClient.get(`/Proveedor/tenant/${TENANT_ID}`, { params });
            const payload = response.data as ApiResponse<Proveedor[]>;

            return {
                isSuccess: payload?.isSuccess ?? true,
                data: payload?.data || [],
                meta: normalizeMeta(payload?.meta, page, pageSize),
                message: payload?.message
            };
        } catch (error) {
            return {
                isSuccess: false,
                data: [],
                message: getErrorMessage(error, 'Error al obtener proveedores')
            };
        }
    },

    getById: async (id: string): Promise<ApiResponse<Proveedor>> => {
        try {
            const response = await apiClient.get(`/Proveedor/tenant/${TENANT_ID}/${id}`);
            return response.data;
        } catch (error) {
            return {
                isSuccess: false,
                data: {},
                message: getErrorMessage(error, 'Error al obtener proveedor')
            };
        }
    },

    create: async (payload: ProveedorPayload): Promise<ApiResponse<{ proveedorId?: string }>> => {
        try {
            const response = await apiClient.post(`/Proveedor/tenant/${TENANT_ID}`, toCreatePayload(payload));
            return response.data;
        } catch (error) {
            return {
                isSuccess: false,
                data: {},
                message: getErrorMessage(error, 'Error al crear proveedor')
            };
        }
    },

    update: async (payload: ProveedorPayload): Promise<ApiResponse<number>> => {
        try {
            const proveedorId = String(payload.proveedorId || '').trim();

            if (!proveedorId) {
                return {
                    isSuccess: false,
                    data: 0,
                    message: 'El proveedorId es obligatorio para actualizar.'
                };
            }

            const response = await apiClient.put(
                `/Proveedor/tenant/${TENANT_ID}/${proveedorId}`,
                toUpdatePayload(payload)
            );

            return response.data;
        } catch (error) {
            return {
                isSuccess: false,
                data: 0,
                message: getErrorMessage(error, 'Error al actualizar proveedor')
            };
        }
    },

    anular: async (id: string): Promise<ApiResponse<number>> => {
        try {
            const response = await apiClient.post(`/Proveedor/tenant/${TENANT_ID}/${id}/anular`);
            return response.data;
        } catch (error) {
            return {
                isSuccess: false,
                data: 0,
                message: getErrorMessage(error, 'Error al anular proveedor')
            };
        }
    },

    delete: async (id: string): Promise<ApiResponse<unknown>> => {
        try {
            const response = await apiClient.delete(`/Proveedor/tenant/${TENANT_ID}/${id}`);
            return response.data;
        } catch (error) {
            return {
                isSuccess: false,
                data: null,
                message: getErrorMessage(error, 'Error al eliminar proveedor')
            };
        }
    }
};
