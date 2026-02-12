// src/types/tablaTransacciones.types.ts

export interface TablaTransacciones {
    transaccionId?: string;
    descripcion: string;
    tipomovimientoId: string;
    tipoOperacionId: string;
    empresaId: string;
    tipoalmacenId?: number; 

    // Propiedades de navegación
    TipoMovimiento?: { descripcion: string };
    TipoOperacion?: { descripcion: string };
    Empresa?: { razon_social: string };
    
    // --- AGREGA ESTO ---
    TipoAlmacenAsociado?: { 
        tipoalmacenId: number; 
        descripcion: string; 
        estado: string 
    };
}

export interface TablaTransaccionesPayload {
    transaccionId?: string;
    descripcion: string;
    tipomovimientoId: string;
    tipoOperacionId: string;
    empresaId: string;
    tipoalmacenId: number;
}