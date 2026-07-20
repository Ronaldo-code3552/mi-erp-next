export interface TipoProveedor {
    tipoproveedorId?: string;
    descripcion?: string;
    estado?: boolean;
}

export interface TipoProveedorFilters {
    FiltroEstado?: boolean;
}

export interface TipoProveedorCreatePayload {
    tipoproveedorId?: string;
    descripcion?: string;
    estado?: boolean;
}

export interface TipoProveedorUpdatePayload {
    descripcion?: string;
    estado?: boolean | null;
}
