// src/types/notaIngreso.types.ts

export interface NotaIngresoDetalle {
    item: number;
    bienId: string;
    cantidad: number;
    costo: number;
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

export interface NotaIngresoPayload {
    transaccionId: string;
    monedaId: string;
    tipo_cambio: number;
    tipodoccomercialId: string;
    doc_referencia: string;
    almacenId: string;
    estado: string;
    cuentausuario: string;
    observaciones: string;
    doc_referencia_numero: string;
    nro_contenedor: string;
    empresaId: string;
    detalles: NotaIngresoDetalle[];
}

export interface NotaIngresoResponse extends Omit<NotaIngresoPayload, 'detalles'> {
    notasingresosId: string;
    fecha_emision: string;
    fecha_doc: string;
    detalles?: NotaIngresoDetalle[];
    
    // Objetos anidados que devuelve el backend (GET BY ID)
    transaccion?: any;
    tipoDocumentoComercial?: any;
    moneda?: any;
    almacen?: any;
}

export interface NotaIngresoFilters {
    SearchTerm?: string;
    FechaInicio?: string;
    FechaFin?: string;
    Estados?: string[];
    Transacciones?: string[];
    TiposDocumentoComercial?: string[];
    CuentasUsuario?: string[];
}