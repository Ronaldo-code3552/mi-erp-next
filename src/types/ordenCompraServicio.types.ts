export interface OrdenCompraServicioRelation {
    descripcion?: string;
    nombre?: string;
    numeroDoc?: string;
    numero_doc?: string;
    docidentId?: string;
    tipoDocumento?: string;
    simbolo?: string;
    simbolomoneda?: string;
    abreviatura?: string;
    monedaId?: string;
    tipoOrdenId?: string;
    tipopagoId?: string;
    proveedorId?: string;
    trabajadorId?: string;
    nombres?: string;
    apellidos?: string;
    direccion?: string;
    telefono_movil?: string;
}

export interface OrdenCompraServicioDetalle {
    item?: number;
    bienId?: string | null;
    BienId?: string | null;
    presentacionId?: string | null;
    PresentacionId?: string | null;
    cantidad?: number | string | null;
    Cantidad?: number | string | null;
    costo?: number | string | null;
    Costo?: number | string | null;
    importe?: number | string | null;
    Importe?: number | string | null;
    descuentoProducto?: number | string | null;
    descuento_producto?: number | string | null;
    DescuentoProducto?: number | string | null;
    observacion?: string | null;
    Observacion?: string | null;
    bien?: {
        bienId?: string;
        descripcion?: string;
        codigo_existencia?: string;
        costo?: number;
        cod_admin?: number;
    };
    Bien?: {
        bienId?: string;
        descripcion?: string;
        codigo_existencia?: string;
        costo?: number;
        cod_admin?: number;
    };
    presentacion?: {
        presentacionId?: string;
        descripcion?: string;
        cantidad?: number;
        unidadmedidaId?: string;
    };
    Presentacion?: {
        presentacionId?: string;
        descripcion?: string;
        cantidad?: number;
        unidadmedidaId?: string;
    };
}

export interface OrdenCompraServicio {
    ordenCompraServicioId?: string;
    ordencompraservicioId?: string;
    OrdenCompraServicioId?: string;
    ordencompraservicio_id?: string;
    numeroOrdenCompra?: string;
    numero_ordencompra?: string;
    NumeroOrdenCompra?: string;
    tipoOrden?: string | OrdenCompraServicioRelation;
    tipo_orden?: string;
    TipoOrden?: string | OrdenCompraServicioRelation;
    pedidoCompraId?: string | null;
    pedidocompraId?: string | null;
    PedidoCompraId?: string | null;
    numeroCotizacion?: string | null;
    numero_cotizacion?: string | null;
    NumeroCotizacion?: string | null;
    fotoCotizacion?: string | null;
    foto_cotizacion?: string | null;
    FotoCotizacion?: string | null;
    fechaEmision?: string | null;
    fecha_emision?: string | null;
    FechaEmision?: string | null;
    fechaEntrega?: string | null;
    fecha_entrega?: string | null;
    FechaEntrega?: string | null;
    monedaId?: string | null;
    MonedaId?: string | null;
    tipoCambio?: number | string | null;
    tipo_cambio?: number | string | null;
    TipoCambio?: number | string | null;
    subtotal?: number | string | null;
    Subtotal?: number | string | null;
    subtotalAfecto?: number | string | null;
    subtotal_afecto?: number | string | null;
    SubtotalAfecto?: number | string | null;
    subtotalInafecto?: number | string | null;
    subtotal_inafecto?: number | string | null;
    SubtotalInafecto?: number | string | null;
    igv?: number | string | null;
    Igv?: number | string | null;
    total?: number | string | null;
    Total?: number | string | null;
    descuentoGlobal?: number | string | null;
    descuento_global?: number | string | null;
    DescuentoGlobal?: number | string | null;
    tipoPagoId?: string | null;
    tipopagoId?: string | null;
    TipoPagoId?: string | null;
    proveedorId?: string | null;
    ProveedorId?: string | null;
    observacion?: string | null;
    Observacion?: string | null;
    lugarEntrega?: string | null;
    lugar_entrega?: string | null;
    LugarEntrega?: string | null;
    trabajadorId?: string | null;
    TrabajadorId?: string | null;
    empresaId?: string | null;
    EmpresaId?: string | null;
    estado?: string | null;
    Estado?: string | null;
    cuentausuarioId?: string | null;
    cuentaUsuarioId?: string | null;
    CuentaUsuarioId?: string | null;
    incluyeIgv?: boolean | null;
    incluye_igv?: boolean | null;
    IncluyeIgv?: boolean | null;
    proveedor?: OrdenCompraServicioRelation;
    Proveedor?: OrdenCompraServicioRelation;
    moneda?: OrdenCompraServicioRelation;
    Moneda?: OrdenCompraServicioRelation;
    tipoPago?: OrdenCompraServicioRelation;
    TipoPago?: OrdenCompraServicioRelation;
    tipoOrdenDetalle?: OrdenCompraServicioRelation;
    TipoOrdenDetalle?: OrdenCompraServicioRelation;
    trabajador?: OrdenCompraServicioRelation;
    Trabajador?: OrdenCompraServicioRelation;
    detalles?: OrdenCompraServicioDetalle[];
    Detalles?: OrdenCompraServicioDetalle[];
}

export interface OrdenCompraServicioFilters {
    estado?: Array<string | number>;
    tipoOrden?: Array<string | number>;
    proveedorId?: Array<string | number>;
    monedaId?: Array<string | number>;
    fechaInicio?: string;
    fechaFin?: string;
}

export interface OrdenCompraServicioPayload {
    ordenCompraServicioId?: string;
    tipoOrden?: string;
    pedidoCompraId?: string | null;
    numeroCotizacion?: string | null;
    fotoCotizacion?: string | null;
    fechaEmision?: string | null;
    fechaEntrega?: string | null;
    monedaId?: string | null;
    tipoCambio?: number | null;
    subtotal?: number | null;
    igv?: number | null;
    total?: number | null;
    descuentoGlobal?: number | null;
    tipoPagoId?: string | null;
    proveedorId?: string | null;
    observacion?: string | null;
    lugarEntrega?: string | null;
    trabajadorId?: string | null;
    estado?: string | null;
    cuentaUsuarioId?: string | null;
    incluyeIgv?: boolean | null;
    detalles?: OrdenCompraServicioDetallePayload[];
}

export interface OrdenCompraServicioDetallePayload {
    bienId?: string | null;
    presentacionId?: string | null;
    cantidad?: number | null;
    costo?: number | null;
    importe?: number | null;
    descuentoProducto?: number | null;
    observacion?: string | null;
}

export interface OrdenCompraServicioDetalleCreatePayload {
    BienId?: string | null;
    PresentacionId?: string | null;
    Cantidad?: number | null;
    Costo?: number | null;
    Importe?: number | null;
    DescuentoProducto?: number | null;
    Observacion?: string | null;
}

export interface OrdenCompraServicioCreatePayload {
    TipoOrden?: string;
    PedidoCompraId?: string | null;
    NumeroCotizacion?: string | null;
    FotoCotizacion?: string | null;
    FechaEmision?: string | null;
    FechaEntrega?: string | null;
    MonedaId?: string | null;
    TipoCambio?: number | null;
    Subtotal?: number | null;
    Igv?: number | null;
    Total?: number | null;
    DescuentoGlobal?: number | null;
    TipoPagoId?: string | null;
    ProveedorId?: string | null;
    Observacion?: string | null;
    LugarEntrega?: string | null;
    TrabajadorId?: string | null;
    CuentaUsuarioId?: string | null;
    IncluyeIgv?: boolean | null;
    Detalles?: OrdenCompraServicioDetalleCreatePayload[];
}

export type OrdenCompraServicioUpdatePayload = Omit<OrdenCompraServicioCreatePayload, "TipoOrden">;
