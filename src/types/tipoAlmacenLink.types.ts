// src/types/tipoAlmacenLink.types.ts

export interface TipoAlmacenLink {
    tipoalmacenId: number;
    descripcion: string;
    estado?: string;
    // transaccionId no viene en el array del JSON, pero lo manejamos por contexto en el modal
}

export interface TipoAlmacenLinkInsertRequest {
    transaccionId: string;
    tipoalmacenId: number;
}

export interface TipoAlmacenLinkUpdateRequest {
    transaccionId: string;
    old_tipoalmacenId: number;
    new_tipoalmacenId: number;
}