export interface ClaseProveedor {
    claseproveedorId?: number;
    descripcion?: string;
    estado?: boolean;
}

export interface ClaseProveedorFilters {
    FiltroEstado?: boolean;
}

export interface ClaseProveedorCreatePayload {
    descripcion?: string;
    estado?: boolean;
}

export interface ClaseProveedorUpdatePayload {
    descripcion?: string;
    estado?: boolean | null;
}
