export interface TipoCambioUniversal {
    tipoCambioUniversalId?: string | number;
    tipocambioId?: string | number;
    fecha?: string;
    Fecha?: string;
    fecha_cambio?: string;
    tipo_cambio?: number | string;
    tipoCambio?: number | string;
    cambio?: number | string;
    valor?: number | string;
    venta?: number | string;
    compra?: number | string;
    precio_venta?: number | string;
    tc_venta?: number | string;
    tc_compra?: number | string;
    monedaId?: string;
    MonedaId?: string;
    moneda?: {
        monedaId?: string;
        descripcion?: string;
        abreviatura?: string;
        simbolomoneda?: string;
    };
}

export interface TipoCambioUniversalFilters {
    FechaInicio?: string;
    FechaFin?: string;
    MonedaId?: string;
    SearchTerm?: string;
}
