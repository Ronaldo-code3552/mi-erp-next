import apiClient from '@/api/apiCliente';
import { ApiResponse } from '@/types';
import {
    OrdenCompraServicio,
    OrdenCompraServicioCreatePayload,
    OrdenCompraServicioDetalleCreatePayload,
    OrdenCompraServicioFilters,
    OrdenCompraServicioPayload,
    OrdenCompraServicioUpdatePayload
} from '@/types/ordenCompraServicio.types';

const EMPRESA_ID = '005';
const USER_ID = 'CU0001';
const BASE_URL = '/OrdenCompraServicio';

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

const singleValue = (value?: Array<string | number>) => {
    if (!Array.isArray(value) || value.length === 0) return undefined;
    const selected = String(value[0] ?? '').trim();
    return selected || undefined;
};

const asNumber = (value?: number | string | null) => {
    if (value === null || value === undefined || value === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
};

const toCreatePayload = (payload: OrdenCompraServicioPayload): OrdenCompraServicioCreatePayload => ({
    TipoOrden: payload.tipoOrden?.trim(),
    PedidoCompraId: payload.pedidoCompraId?.trim() || null,
    NumeroCotizacion: payload.numeroCotizacion?.trim() || null,
    FotoCotizacion: payload.fotoCotizacion?.trim() || null,
    FechaEmision: payload.fechaEmision || null,
    FechaEntrega: payload.fechaEntrega || null,
    MonedaId: payload.monedaId?.trim() || null,
    TipoCambio: asNumber(payload.tipoCambio),
    Subtotal: asNumber(payload.subtotal),
    SubtotalAfecto: asNumber(payload.subtotalAfecto),
    SubtotalExonerado: asNumber(payload.subtotalExonerado),
    Igv: asNumber(payload.igv),
    Total: asNumber(payload.total),
    DescuentoGlobal: asNumber(payload.descuentoGlobal),
    TipoPagoId: payload.tipoPagoId?.trim() || null,
    ProveedorId: payload.proveedorId?.trim() || null,
    Observacion: payload.observacion?.trim() || null,
    LugarEntrega: payload.lugarEntrega?.trim() || null,
    TrabajadorId: payload.trabajadorId?.trim() || null,
    CuentaUsuarioId: payload.cuentaUsuarioId?.trim() || USER_ID,
    IncluyeIgv: payload.incluyeIgv ?? true,
    Detalles: (payload.detalles || []).map(toDetallePayload)
});

const toDetallePayload = (detalle: NonNullable<OrdenCompraServicioPayload['detalles']>[number]): OrdenCompraServicioDetalleCreatePayload => ({
    BienId: detalle.bienId?.trim() || null,
    PresentacionId: detalle.presentacionId?.trim() || null,
    Cantidad: asNumber(detalle.cantidad),
    Costo: asNumber(detalle.costo),
    ConversionTotal: asNumber(detalle.conversionTotal),
    Importe: asNumber(detalle.importe),
    DescuentoProducto: asNumber(detalle.descuentoProducto) ?? 0,
    AfectoInafecto: detalle.afectoInafecto ?? null,
    Observacion: detalle.observacion?.trim() || null
});

const toUpdatePayload = (payload: OrdenCompraServicioPayload): OrdenCompraServicioUpdatePayload => {
    const { TipoOrden, ...updatePayload } = toCreatePayload(payload);
    void TipoOrden;
    return updatePayload;
};

export const ordenCompraServicioService = {
    getAll: async (
        page = 1,
        pageSize = 20,
        term = '',
        filters: OrdenCompraServicioFilters = {}
    ): Promise<ApiResponse<OrdenCompraServicio[]>> => {
        try {
            const params: Record<string, string | number> = {
                PageNumber: page,
                PageSize: pageSize
            };

            if (term.trim()) params.SearchTerm = term.trim();

            const estado = singleValue(filters.estado);
            const tipoOrden = singleValue(filters.tipoOrden);
            const proveedorId = singleValue(filters.proveedorId);
            const monedaId = singleValue(filters.monedaId);

            if (estado) params.FiltroEstado = estado;
            if (tipoOrden) params.TipoOrden = tipoOrden;
            if (proveedorId) params.ProveedorId = proveedorId;
            if (monedaId) params.MonedaId = monedaId;
            if (filters.fechaInicio) params.FechaInicio = filters.fechaInicio;
            if (filters.fechaFin) params.FechaFin = filters.fechaFin;

            const response = await apiClient.get(`${BASE_URL}/empresa/${EMPRESA_ID}`, { params });
            const payload = response.data as ApiResponse<OrdenCompraServicio[]>;

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
                message: getErrorMessage(error, 'Error al obtener ordenes de compra/servicio')
            };
        }
    },

    getById: async (id: string): Promise<ApiResponse<OrdenCompraServicio>> => {
        try {
            const response = await apiClient.get(`${BASE_URL}/empresa/${EMPRESA_ID}/${id}`);
            return response.data;
        } catch (error) {
            return {
                isSuccess: false,
                data: {},
                message: getErrorMessage(error, 'Error al obtener la orden de compra/servicio')
            };
        }
    },

    create: async (payload: OrdenCompraServicioPayload): Promise<ApiResponse<{
        ordenCompraServicioId?: string;
        ordencompraservicioId?: string;
        OrdenCompraServicioId?: string;
        numeroOrdenCompra?: string;
        NumeroOrdenCompra?: string;
    }>> => {
        try {
            const response = await apiClient.post(`${BASE_URL}/empresa/${EMPRESA_ID}`, toCreatePayload(payload));
            return response.data;
        } catch (error) {
            return {
                isSuccess: false,
                data: {},
                message: getErrorMessage(error, 'Error al crear la orden de compra/servicio')
            };
        }
    },

    update: async (payload: OrdenCompraServicioPayload): Promise<ApiResponse<unknown>> => {
        try {
            const ordenId = String(payload.ordenCompraServicioId || '').trim();

            if (!ordenId) {
                return {
                    isSuccess: false,
                    data: null,
                    message: 'El ordenCompraServicioId es obligatorio para actualizar.'
                };
            }

            const response = await apiClient.put(
                `${BASE_URL}/empresa/${EMPRESA_ID}/${ordenId}`,
                toUpdatePayload(payload)
            );

            return response.data;
        } catch (error) {
            return {
                isSuccess: false,
                data: null,
                message: getErrorMessage(error, 'Error al actualizar la orden de compra/servicio')
            };
        }
    },

    anular: async (id: string): Promise<ApiResponse<unknown>> => {
        try {
            const response = await apiClient.post(`${BASE_URL}/empresa/${EMPRESA_ID}/${id}/anular`);
            return response.data;
        } catch (error) {
            return {
                isSuccess: false,
                data: null,
                message: getErrorMessage(error, 'Error al anular la orden de compra/servicio')
            };
        }
    },

    imprimir: async (id: string): Promise<ApiResponse<{
        fileName?: string;
        base64?: string;
        esFormatoSunat?: boolean;
    }>> => {
        try {
            const response = await apiClient.get(`${BASE_URL}/empresa/${EMPRESA_ID}/${id}/imprimir`);
            return response.data;
        } catch (error) {
            return {
                isSuccess: false,
                data: {},
                message: getErrorMessage(error, 'Error al imprimir la orden de compra/servicio')
            };
        }
    },

    aprobar: async (id: string): Promise<ApiResponse<unknown>> => {
        try {
            const response = await apiClient.patch(`${BASE_URL}/empresa/${EMPRESA_ID}/${id}/aprobar`);
            return response.data;
        } catch (error) {
            return {
                isSuccess: false,
                data: null,
                message: getErrorMessage(error, 'Error al aprobar la orden de compra/servicio')
            };
        }
    },

    delete: async (id: string): Promise<ApiResponse<unknown>> => {
        try {
            const response = await apiClient.delete(`${BASE_URL}/empresa/${EMPRESA_ID}/${id}`);
            return response.data;
        } catch (error) {
            return {
                isSuccess: false,
                data: null,
                message: getErrorMessage(error, 'Error al eliminar la orden de compra/servicio')
            };
        }
    }
};
