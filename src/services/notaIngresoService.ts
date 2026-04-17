// src/services/notaIngresoService.ts

import apiClient from '../api/apiCliente';
import { NotaIngresoPayload, NotaIngresoResponse, NotaIngresoFilters } from '../types/notaIngreso.types';

export const notaIngresoService = {
    // 1. Obtener Listado Paginado por Almacén (con filtros avanzados)
    getByAlmacen: async (
        almacenId?: string | null,
        page: number = 1, 
        pageSize: number = 20, 
        search: string = '', 
        filters: any = {}, // <-- El useCrud inyectará { estadoJson: [], transaccionJson: [], etc } aquí
        empresaId: string = '005'
    ) => {
        try {
            const params = new URLSearchParams();
            params.append('page', String(page));
            params.append('pageSize', String(pageSize));
            // Backend: almacen es opcional, pero si no viene debe venir EmpresaId
            if (empresaId && String(empresaId).trim() !== '') {
                params.append('EmpresaId', String(empresaId).trim());
            }

            // Si hay búsqueda global (Input de texto)
            if (search && search.trim() !== '') {
                params.append('SearchTerm', search.trim());
            }

            // Filtros de Fecha
            if (filters.fecha_inicio) params.append('FechaInicio', filters.fecha_inicio);
            if (filters.fecha_fin) params.append('FechaFin', filters.fecha_fin);

            // Mapeo de Arrays (El Select Múltiple envía arrays)
            if (Array.isArray(filters.estadoJson)) {
                filters.estadoJson.forEach((e: string) => params.append('Estados', e));
            }
            if (Array.isArray(filters.transaccionJson)) {
                filters.transaccionJson.forEach((t: string) => params.append('Transacciones', t));
            }
            if (Array.isArray(filters.tipocomercialJson)) {
                filters.tipocomercialJson.forEach((t: string) => params.append('TiposDocumentoComercial', t));
            }
            if (Array.isArray(filters.usuarioJson)) {
                filters.usuarioJson.forEach((c: string) => params.append('CuentasUsuario', c));
            }

            const trimmedAlmacenId = String(almacenId ?? '').trim();
            const url = trimmedAlmacenId
                ? `/NotaIngreso/almacen/${trimmedAlmacenId}?${params.toString()}`
                : `/NotaIngreso/almacen?${params.toString()}`;

            const response = await apiClient.get(url);
            
            if (response.status === 204) {
                 return { isSuccess: true, data: [], meta: { currentPage: page, totalPages: 1, totalRecords: 0 } };
            }

            return {
                isSuccess: true,
                data: response.data?.data || [],
                meta: response.data?.meta || { currentPage: page, totalPages: 1, totalRecords: 0 }
            };
        } catch (error: any) {
            console.error("Error en getByAlmacen:", error);
            return {
                isSuccess: false,
                message: error.response?.data?.message || 'Error al obtener el listado'
            };
        }
    },
    // 2. Obtener Detalle por ID
    getById: async (id: string) => {
        try {
            const response = await apiClient.get(`/NotaIngreso/detalle/${id}`);
            return {
                isSuccess: true,
                data: response.data?.data as NotaIngresoResponse
            };
        } catch (error: any) {
            return {
                isSuccess: false,
                message: error.response?.data?.message || 'Error al obtener la Nota de Ingreso'
            };
        }
    },

    // 3. Crear Nueva Nota de Ingreso
    create: async (payload: NotaIngresoPayload) => {
        try {
            const response = await apiClient.post('/NotaIngreso', payload);
            return {
                isSuccess: true,
                data: response.data?.data, // Devuelve { Resultado, NotaIngresoId, UsaLotes }
                message: 'Nota de Ingreso creada con éxito'
            };
        } catch (error: any) {
            return {
                isSuccess: false,
                message: error.response?.data?.message || 'Error al crear la Nota de Ingreso'
            };
        }
    },

    // 4. Anular Nota de Ingreso
    anular: async (notasingresosId: string, empresaId: string) => {
        try {
            const response = await apiClient.patch('/NotaIngreso/anular', {
                notasingresosId,
                empresaId
            });
            return {
                isSuccess: true,
                message: response.data?.message || 'Nota de Ingreso anulada correctamente'
            };
        } catch (error: any) {
            return {
                isSuccess: false,
                message: error.response?.data?.message || 'Error al anular la Nota de Ingreso'
            };
        }
    }
};
