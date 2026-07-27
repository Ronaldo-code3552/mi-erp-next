// src/types/index.ts

export interface ApiResponse<T> {
    isSuccess: boolean;
    data: T;
    meta?: {
        totalRecords: number;
        totalPages: number;
        currentPage: number;
        pageSize?: number;
        totalStock?: number;
        TotalRecords?: number;
        TotalPages?: number;
        CurrentPage?: number;
        PageSize?: number;
        TotalStock?: number;
    };
    message?: string;
}
export * from './solicitudReposicion.types';
export * from './claseBien.types';
export * from './senderWhatsApp.types';
export * from './contactoWhatsApp.types';
export * from './plantillaWhatsApp.types';
export * from './conversacionWhatsApp.types';
export * from './mensajeWhatsApp.types';
export * from './proveedor.types';
export * from './tipoProveedor.types';
export * from './claseProveedor.types';
export * from './ubigeo.types';
export * from './ordenCompraServicio.types';
export * from './tipoOrden.types';
export * from './tipoPago.types';
export * from './moneda.types';
export * from './trabajador.types';
export * from './tipoCambioUniversal.types';
export * from './banco.types';
export * from './cuentasProveedor.types';
export * from './documentoCompra.types';
export * from './documentoPdf.types';
export * from './motivoNcNdElectronico.types';
