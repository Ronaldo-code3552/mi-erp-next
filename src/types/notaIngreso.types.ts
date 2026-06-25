// src/types/notaIngreso.types.ts

export interface EntidadLite {
    descripcion?: string;
}

export interface ClienteLite {
    descripcion?: string;
}

export interface ProveedorLite {
    descripcion?: string;
}

export interface TablaTransaccionesLite {
    descripcion?: string;
}

export interface TipoDocumentoComercialLite {
    descripcion?: string;
}

export interface MonedaLite {
    descripcion?: string;
    abreviatura?: string;
    simbolomoneda?: string;
}

export interface AlmacenLite {
    descripcion?: string;
}

export interface CuentaUsuarioLite {
    observacion?: string;
}

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
    fecha_doc?: string;
    fecha_emision?: string;
    proveedorId?: string;
    clienteId?: string;
}

export interface NotaIngresoResponse extends Omit<NotaIngresoPayload, 'detalles'> {
    notasingresosId: string;
    fecha_emision: string;
    fecha_doc: string;
    detalles?: NotaIngresoDetalle[];
    
    // Objetos anidados que devuelve el backend (GET BY ID)
    tablaTransacciones?: TablaTransaccionesLite;
    transaccion?: TablaTransaccionesLite;
    tipoDocumentoComercial?: TipoDocumentoComercialLite;
    moneda?: MonedaLite;
    almacen?: AlmacenLite;
    cuentaUsuario?: CuentaUsuarioLite;

    referenciaDocumento?: {
        idDocumento?: string;
        entidadId?: string;
        documentoReferencia?: string;
        clienteId?: string;
        proveedorId?: string;
        entidad?: EntidadLite;
        cliente?: ClienteLite;
        proveedor?: ProveedorLite;
    };

    // Campos legacy (si el backend aún los devuelve en algunos casos)
    cliente?: ClienteLite;
    proveedor?: ProveedorLite;
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
