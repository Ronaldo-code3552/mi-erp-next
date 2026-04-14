// src/types/notaSalida.types.ts

export interface NotaSalidaDetalle {
    item: number;
    bienId: string;
    cantidad: number;
    precio: number;   // 🚀 En Salidas usamos "precio" según el backend
    importe: number;
    presentacionId: string | null;
    loteId?: string | null;

    // Campos Auxiliares para la UI (Frontend)
    descripcion_aux?: string;
    unidad_aux?: string;
    unidades_opciones?: Array<{
        key: string;
        value: string;
        presentacionId?: string | null;
    }>;
}

export interface NotaSalidaPayload {
    transaccionId: string;
    monedaId: string;
    tipo_cambio: number;
    tipodoccomercialId: string;
    doc_referencia: string;
    almacenId: string;
    almacenDestinoId?: string; // 🚀 Requerido para Traslados (TE)
    estado: string;
    cuentausuario: string;
    observaciones: string;
    doc_referencia_numero: string;
    empresaId: string;
    detalles: NotaSalidaDetalle[];
}

export interface NotaSalidaResponse extends Omit<NotaSalidaPayload, 'detalles'> {
    notassalidaId: string;
    fecha_emision: string;
    fecha_doc: string;
    detalles?: NotaSalidaDetalle[];
    
    // Campos extra que suele devolver el SP para la grilla
    transaccionDesc?: string;
    tipodoccomercialDesc?: string;
    CuentasusuarioId?: string;
    NombreUsuario?: string;
    clienteDesc?: string;
    
    // Objetos anidados que devuelve el backend (GET BY ID)
    tablaTransacciones?: any;
    tipoDocumentoComercial?: any;
    moneda?: any;
    almacen?: any;
    cliente?: any;
    cuentaUsuario?: any;
}