import apiClient from '@/api/apiCliente';
import { ApiResponse } from '@/types';
import {
    SolicitudReposicionAprobarPayload,
    SolicitudReposicionAnularPayload,
    SolicitudReposicionCreatePayload,
    SolicitudReposicionFilters,
    SolicitudReposicionRechazarPayload,
    SolicitudReposicionResponse,
    SolicitudReposicionUpdatePayload
} from '@/types/solicitudReposicion.types';

const buildFilterCsv = (value?: Array<string | number>) => {
    if (!Array.isArray(value) || value.length === 0) return null;

    const clean = value
        .map(x => String(x ?? '').trim())
        .filter(x => x !== '');

    return clean.length > 0 ? clean.join(',') : null;
};

const extractErrorMessage = (error: unknown, fallback: string) => {
    if (typeof error === 'object' && error !== null) {
        const response = (error as { response?: unknown }).response;

        if (typeof response === 'object' && response !== null) {
            const data = (response as { data?: unknown }).data;

            if (typeof data === 'object' && data !== null) {
                const message = (data as { message?: unknown }).message;

                if (typeof message === 'string' && message.trim() !== '') {
                    return message;
                }
            }
        }
    }

    if (error instanceof Error && error.message) {
        return error.message;
    }

    return fallback;
};

export const solicitudReposicionService = {
    getAll: async (
        page = 1,
        pageSize = 20,
        term = '',
        filters: SolicitudReposicionFilters = {}
    ): Promise<ApiResponse<SolicitudReposicionResponse[]>> => {
        try {
            const params = new URLSearchParams();

            params.append('PageNumber', String(page || 1));
            params.append('PageSize', String(pageSize || 20));

            if (term && term.trim() !== '') {
                params.append('SearchTerm', term.trim());
            }

            if (filters.FechaInicio) params.append('FechaInicio', filters.FechaInicio);
            if (filters.FechaFin) params.append('FechaFin', filters.FechaFin);

            const filtroEstado = buildFilterCsv(filters.FiltroEstado);
            const filtroEstadoDetalle = buildFilterCsv(filters.FiltroEstadoDetalle);
            const filtroAlmacenOrigen = buildFilterCsv(filters.FiltroAlmacenOrigen);
            const filtroAlmacenDestino = buildFilterCsv(filters.FiltroAlmacenDestino);
            const filtroCuentaUsuario = buildFilterCsv(filters.FiltroCuentaUsuario);
            const filtroUsuarioAprobacion = buildFilterCsv(filters.FiltroUsuarioAprobacion);
            const filtroBien = buildFilterCsv(filters.FiltroBien);
            const filtroPresentacion = buildFilterCsv(filters.FiltroPresentacion);

            if (filtroEstado) params.append('FiltroEstado', filtroEstado);
            if (filtroEstadoDetalle) params.append('FiltroEstadoDetalle', filtroEstadoDetalle);
            if (filtroAlmacenOrigen) params.append('FiltroAlmacenOrigen', filtroAlmacenOrigen);
            if (filtroAlmacenDestino) params.append('FiltroAlmacenDestino', filtroAlmacenDestino);
            if (filtroCuentaUsuario) params.append('FiltroCuentaUsuario', filtroCuentaUsuario);
            if (filtroUsuarioAprobacion) params.append('FiltroUsuarioAprobacion', filtroUsuarioAprobacion);
            if (filtroBien) params.append('FiltroBien', filtroBien);
            if (filtroPresentacion) params.append('FiltroPresentacion', filtroPresentacion);

            const response = await apiClient.get(`/almacen/solicitudes-reposicion?${params.toString()}`);

            return {
                isSuccess: response.data?.isSuccess ?? true,
                data: response.data?.data || [],
                meta: response.data?.meta || {
                    currentPage: page,
                    totalPages: 1,
                    totalRecords: 0,
                    pageSize
                },
                message: response.data?.message
            };
        } catch (error: unknown) {
            return {
                isSuccess: false,
                data: [],
                message: extractErrorMessage(error, 'Error al obtener solicitudes de reposición')
            };
        }
    },

    getById: async (id: string | number): Promise<ApiResponse<SolicitudReposicionResponse>> => {
        try {
            const response = await apiClient.get(`/almacen/solicitudes-reposicion/${id}`);
            return response.data;
        } catch (error: unknown) {
            return {
                isSuccess: false,
                data: {} as SolicitudReposicionResponse,
                message: extractErrorMessage(error, 'Error al obtener la solicitud de reposición')
            };
        }
    },

    imprimir: async (
        id: string | number
    ): Promise<ApiResponse<{ fileName?: string; base64?: string }>> => {
        try {
            const response = await apiClient.get(`/almacen/solicitudes-reposicion/${id}/imprimir`);
            return response.data;
        } catch (error: unknown) {
            return {
                isSuccess: false,
                data: {},
                message: extractErrorMessage(error, 'Error al generar la impresión de la solicitud de reposición')
            };
        }
    },

    create: async (payload: SolicitudReposicionCreatePayload): Promise<ApiResponse<{ id: number }>> => {
        try {
            const response = await apiClient.post('/almacen/solicitudes-reposicion', payload);
            return response.data;
        } catch (error: unknown) {
            return {
                isSuccess: false,
                data: { id: 0 },
                message: extractErrorMessage(error, 'Error al crear la solicitud de reposición')
            };
        }
    },

    update: async (
        id: string | number,
        payload: SolicitudReposicionUpdatePayload
    ): Promise<ApiResponse<unknown>> => {
        try {
            const response = await apiClient.put(`/almacen/solicitudes-reposicion/${id}`, payload);
            return response.data;
        } catch (error: unknown) {
            return {
                isSuccess: false,
                data: null,
                message: extractErrorMessage(error, 'Error al actualizar la solicitud de reposición')
            };
        }
    },

    delete: async (id: string | number): Promise<ApiResponse<unknown>> => {
        try {
            const response = await apiClient.delete(`/almacen/solicitudes-reposicion/${id}`);
            return response.data;
        } catch (error: unknown) {
            return {
                isSuccess: false,
                data: null,
                message: extractErrorMessage(error, 'Error al eliminar la solicitud de reposición')
            };
        }
    },

    aprobar: async (
        id: string | number,
        payload: SolicitudReposicionAprobarPayload
    ): Promise<ApiResponse<unknown>> => {
        try {
            const response = await apiClient.post(`/almacen/solicitudes-reposicion/${id}/aprobar`, payload);
            return response.data;
        } catch (error: unknown) {
            return {
                isSuccess: false,
                data: null,
                message: extractErrorMessage(error, 'Error al procesar la aprobación de la solicitud de reposición')
            };
        }
    },

    rechazar: async (
        id: string | number,
        payload: SolicitudReposicionRechazarPayload
    ): Promise<ApiResponse<unknown>> => {
        try {
            const response = await apiClient.post(`/almacen/solicitudes-reposicion/${id}/rechazar`, payload);
            return response.data;
        } catch (error: unknown) {
            return {
                isSuccess: false,
                data: null,
                message: extractErrorMessage(error, 'Error al rechazar la solicitud de reposición')
            };
        }
    },

    anular: async (
        id: string | number,
        payload?: SolicitudReposicionAnularPayload
    ): Promise<ApiResponse<unknown>> => {
        try {
            const response = await apiClient.post(`/almacen/solicitudes-reposicion/${id}/anular`, payload || {
                motivo_anulacion: 'Solicitud anulada desde frontend'
            });

            return response.data;
        } catch (error: unknown) {
            return {
                isSuccess: false,
                data: null,
                message: extractErrorMessage(error, 'Error al anular la solicitud de reposición')
            };
        }
    }
};
