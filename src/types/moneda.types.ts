export interface Moneda {
    monedaId?: string;
    MonedaId?: string;
    descripcion?: string;
    Descripcion?: string;
    abreviatura?: string;
    Abreviatura?: string;
    simbolomoneda?: string;
    Simbolomoneda?: string;
    simbolo?: string;
    Simbolo?: string;
    tipoCambioUniversal?: {
        fecha?: string;
        tc_venta?: number | string;
        tc_compra?: number | string;
    };
    TipoCambioUniversal?: {
        fecha?: string;
        tc_venta?: number | string;
        tc_compra?: number | string;
    };
    estado?: boolean;
    Estado?: boolean;
}
