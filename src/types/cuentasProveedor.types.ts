export interface CuentaProveedorRelation {
    idBancos?: number;
    nombre?: string;
    descripcion?: string;
    monedaId?: string;
    simbolomoneda?: string;
    abreviatura?: string;
}

export interface CuentaProveedor {
    cuentasProveedorId?: string;
    cuentasproveedorId?: string;
    CuentasProveedorId?: string;
    bancosId?: number;
    BancosId?: number;
    idBancos?: number;
    proveedorId?: string;
    ProveedorId?: string;
    numeroCuenta?: string;
    NumeroCuenta?: string;
    n_cuenta?: string;
    cci?: string;
    Cci?: string;
    c_cci?: string;
    monedaId?: string;
    MonedaId?: string;
    observacion?: string;
    Observacion?: string;
    totalPagado?: number | string;
    TotalPagado?: number | string;
    total_pagado?: number | string;
    banco?: CuentaProveedorRelation;
    bancos?: CuentaProveedorRelation;
    Banco?: CuentaProveedorRelation;
    moneda?: CuentaProveedorRelation;
    Moneda?: CuentaProveedorRelation;
}

export interface CuentasProveedorFilters {
    SearchTerm?: string;
    BancosId?: number | null;
    MonedaId?: string | null;
}

export interface CuentaProveedorPayload {
    BancosId?: number | null;
    NumeroCuenta?: string | null;
    Cci?: string | null;
    MonedaId?: string | null;
    Observacion?: string | null;
    TotalPagado?: number | null;
}
