export interface Trabajador {
    trabajadorId?: string;
    TrabajadorId?: string;
    descripcion?: string;
    Descripcion?: string;
    nombres?: string;
    apellidos?: string;
    nombres_apellidos?: string;
    numeroDoc?: string;
    numero_doc?: string;
    docidentId?: string;
    estado?: boolean | string;
    cargo?: {
        descripcion?: string;
    };
    area?: {
        descripcion?: string;
    };
}

export interface TrabajadorFilters {
    estado?: boolean | null;
    docidentId?: string | null;
    cargoId?: string | null;
    areaId?: string | null;
}
