import type { ReferenciasUso } from "./referenciasUso.types";

export interface DocumentoCompraTipoDocumentoComercial {
    tipodoccomercialId?: string;
    descripcion?: string;
    abreviatura?: string;
    codtablaSunat?: string;
}

export interface DocumentoCompraProveedor {
    proveedorId?: string;
    descripcion?: string;
    numero_doc?: string;
    direccion?: string;
}

export interface DocumentoCompraMoneda {
    monedaId?: string;
    descripcion?: string;
    abreviatura?: string;
    simbolomoneda?: string;
}

export interface DocumentoCompraTipoPago {
    tipopagoId?: string;
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

export interface DocumentoCompraReferencia {
    documentocompraId?: string;
    documentoCompraId?: string;
    tipodoccomercialId?: string;
    serie?: string;
    numero?: string;
    fecha_emision?: string;
    fechaEmision?: string;
    total?: number;
    estado?: string;
}

export interface DocumentoCompraMotivoElectronico {
    motivoElectronicoId?: string;
    motivoelectronicoId?: string;
    MotivoElectronicoId?: string;
    tipoDocumento?: "NC" | "ND";
    tipodocumento?: "NC" | "ND";
    TipoDocumento?: "NC" | "ND";
    concepto?: string;
    Concepto?: string;
}

export interface DocumentoCompraDetalleBien {
    bienId?: string;
    descripcion?: string;
    codigo_existencia?: string;
    cod_admin?: string | number;
    afecto_inafecto?: boolean;
    operacionesItemId?: string;
    operacionesItem?: {
        operacionesItemId?: string;
        descripcion?: string;
        valor?: number;
    };
    operacionItem?: {
        operacionesItemId?: string;
        descripcion?: string;
        valor?: number;
    };
}

export interface DocumentoCompraDetallePresentacion {
    presentacionId?: string;
    descripcion?: string;
    cantidad?: number;
    estado?: boolean;
}

export interface DocumentoCompraDetalle {
    item?: number;
    bienId?: string;
    presentacionId?: string;
    cantidad?: number;
    costo?: number;
    conversionTotal?: number;
    conversion_total?: number;
    ConversionTotal?: number;
    importe?: number;
    saldoCantidad?: number;
    descuentoProducto?: number;
    descuento_producto?: number;
    afectoInafecto?: boolean;
    afecto_inafecto?: boolean;
    observacion?: string;
    saldoTemporal?: number;
    saldo_temporal?: number;
    igvCosto?: number;
    condicionEstado?: string;
    maximoExceso?: number;
    maximo_exceso?: number;
    bien?: DocumentoCompraDetalleBien;
    presentacion?: DocumentoCompraDetallePresentacion;
}

export interface DocumentoCompra {
    documentocompraId?: string;
    documentoCompraId?: string;
    ordencompraservicioId?: string | null;
    ordenCompraServicioId?: string | null;
    tipodoccomercialId?: string | null;
    tipoDocComercialId?: string | null;
    serie?: string | null;
    numero?: string | null;
    fechaEmision?: string | null;
    fechaDoc?: string | null;
    fecha_emision?: string | null;
    fecha_doc?: string | null;
    guiasremisionId?: string | null;
    guiasRemisionId?: string | null;
    proveedorId?: string | null;
    monedaId?: string | null;
    valorventaAfecto?: number | null;
    valorVentaAfecto?: number | null;
    valorventa_afecto?: number | null;
    valorventaExonerado?: number | null;
    valorVentaExonerado?: number | null;
    valorventa_exonerado?: number | null;
    valorventaInafecto?: number | null;
    valorventa_inafecto?: number | null;
    igv?: number | null;
    total?: number | null;
    saldo?: number | null;
    observacion?: string | null;
    tipopagoId?: string | null;
    tipoPagoId?: string | null;
    detraccion?: boolean | null;
    fotoDocumentocompra?: string | null;
    fotoDocumentoCompra?: string | null;
    foto_documentocompra?: string | null;
    estado?: string | null;
    empresaId?: string | null;
    cuentausuarioId?: string | null;
    cuentaUsuarioId?: string | null;
    tipoCompra?: string | null;
    tipo_compra?: string | null;
    documentoReferencia?: string | DocumentoCompraReferencia | null;
    documento_referencia?: string | null;
    motivoElectronicoId?: string | null;
    motivoelectronicoId?: string | null;
    MotivoElectronicoId?: string | null;
    motivoElectronico?: DocumentoCompraMotivoElectronico | null;
    MotivoElectronico?: DocumentoCompraMotivoElectronico | null;
    motivo?: DocumentoCompraMotivoElectronico | null;
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
    referenciasUso?: ReferenciasUso | string | null;
    ReferenciasUso?: ReferenciasUso | string | null;
}

export interface DocumentoCompraFiltros {
    tipo_documento?: Array<string | number>;
    proveedor?: Array<string | number>;
    moneda?: Array<string | number>;
    tipo_pago?: Array<string | number>;
    estado?: string | number;
    fecha_inicio?: string;
    fecha_fin?: string;
    tipo_compra?: string;
    estados_excluidos?: Array<string | number>;
}

export interface DocumentoCompraReporteParams {
    search?: string;
    filters?: DocumentoCompraFiltros;
    soloDisponibles?: boolean;
    soloStock?: boolean;
}

export interface DocumentoCompraDetallePayload {
    bienId: string;
    presentacionId: string;
    item: number;
    cantidad: number;
    costo: number;
    conversionTotal: number;
    importe: number;
    descuentoProducto: number;
    observacion: string | null;
    maximoExceso: number;
}

export interface DocumentoCompraPayload {
    ordenCompraServicioId: string | null;
    tipoDocComercialId: string;
    serie: string;
    numero: string;
    fechaEmision: string;
    fechaDoc: string;
    guiasRemisionId: string | null;
    proveedorId: string;
    monedaId: string;
    valorVentaAfecto: number;
    valorVentaExonerado: number;
    igv: number;
    total: number;
    saldo: number;
    observacion: string | null;
    tipoPagoId: string;
    detraccion: boolean;
    fotoDocumentoCompra: string | null;
    cuentaUsuarioId: string;
    tipoCompra: string | null;
    documentoReferencia: string | null;
    motivoElectronicoId: string | null;
    incluyeIgv: boolean;
    tipoCambio: number;
    igvPorcentaje: number;
    detalles: DocumentoCompraDetallePayload[];
}

export interface DocumentoCompraCreatedDto {
    documentoCompraId: string;
}

export interface TipoDocumentoComercialCompra {
    tipodoccomercialId: string;
    descripcion: string;
    abreviatura?: string;
    estado?: boolean;
    tabla_referencia?: string;
}
