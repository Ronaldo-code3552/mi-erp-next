// src/types/documentoCompra.types.ts

export interface DocumentoCompraTipoDocumentoComercial {
    descripcion?: string;
    abreviatura?: string;
    codtablaSunat?: string;
}

export interface DocumentoCompraProveedor {
    descripcion?: string;
    numero_doc?: string;
    direccion?: string;
}

export interface DocumentoCompraMoneda {
    descripcion?: string;
    abreviatura?: string;
    simbolomoneda?: string;
}

export interface DocumentoCompraTipoPago {
    descripcion?: string;
    estado?: boolean;
}

export interface DocumentoCompraCuentaUsuario {
    usuario?: string;
    estado?: boolean;
}

export interface DocumentoCompraEmpresa {
    razon_social?: string;
    ruc?: string;
}

export interface DocumentoCompraDetalleBien {
    descripcion?: string;
    codigo_existencia?: string;
}

export interface DocumentoCompraDetallePresentacion {
    descripcion?: string;
    estado?: boolean;
}

export interface DocumentoCompraDetalle {
    item?: number;
    bienId?: string;
    presentacionId?: string;
    cantidad?: number;
    conversionTotal?: number;
    costo?: number;
    importe?: number;
    saldoCantidad?: number;
    descuentoProducto?: number;
    afectoInafecto?: boolean;
    observacion?: string;
    saldoTemporal?: number;
    igvCosto?: number;
    condicionEstado?: string;
    maximoExceso?: number;
    bien?: DocumentoCompraDetalleBien;
    presentacion?: DocumentoCompraDetallePresentacion;
}

export interface DocumentoCompra {
    documentocompraId: string;
    ordencompraservicioId?: string | null;
    tipodoccomercialId?: string | null;
    serie?: string | null;
    numero?: string | null;

    // Compatibilidad con respuestas legacy y nuevas
    fechaEmision?: string | null;
    fechaDoc?: string | null;
    fecha_emision?: string | null;
    fecha_doc?: string | null;

    guiasremisionId?: string | null;
    proveedorId?: string | null;
    monedaId?: string | null;
    valorventaAfecto?: number | null;
    valorventaInafecto?: number | null;
    valorventa_afecto?: number | null;
    valorventa_inafecto?: number | null;
    igv?: number | null;
    total?: number | null;
    saldo?: number | null;
    observacion?: string | null;
    tipopagoId?: string | null;
    detraccion?: boolean | null;
    fotoDocumentocompra?: string | null;
    foto_documentocompra?: string | null;
    estado?: string | null;
    empresaId?: string | null;
    cuentausuarioId?: string | null;
    tipoCompra?: string | null;
    tipo_compra?: string | null;
    documentoReferencia?: string | null;
    documento_referencia?: string | null;
    motivoelectronicoId?: string | null;
    incluyeIgv?: boolean | null;
    incluye_igv?: boolean | null;
    tipoCambio?: number | null;
    tipo_cambio?: number | null;

    tipoDocumento?: DocumentoCompraTipoDocumentoComercial;
    tipoDocumentoComercial?: DocumentoCompraTipoDocumentoComercial;
    proveedor?: DocumentoCompraProveedor;
    moneda?: DocumentoCompraMoneda;
    tipoPago?: DocumentoCompraTipoPago;
    cuentaUsuario?: DocumentoCompraCuentaUsuario;
    empresa?: DocumentoCompraEmpresa;
    detalles?: DocumentoCompraDetalle[];
}
