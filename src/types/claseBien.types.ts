export interface ClaseBien {
    clasebienId: string;
    descripcion?: string;
    estado?: boolean;
}

export interface ClaseBienFilters {
    estado?: boolean | number;
}

export type ClaseBienPayload = ClaseBien;
