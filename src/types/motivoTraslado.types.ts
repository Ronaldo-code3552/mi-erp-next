// src/types/motivoTraslado.types.ts

export interface MotivoTraslado {
    motivotrasladoId?: string;
    descripcion: string;
    estado: boolean;
    tipomovimientoId: string; // Se mantiene en lectura si la BD lo devuelve
    COD_SUNAT: string;
    
    // Propiedades de navegación
    tipoMovimiento?: {
        descripcion: string;
    };
    sunatCatalogo?: {
        descripcion: string;
        nivel: string;
    };
}

export interface MotivoTrasladoPayload {
    descripcion: string;
    COD_SUNAT: string;
    // tipomovimientoId eliminado
}