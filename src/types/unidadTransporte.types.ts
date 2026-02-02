export interface Marca {
    marcaId: number;
    descripcion: string;
}

export interface Modelo {
    modeloId: number;
    descripcion: string;
    marcaId: number;
    marca?: Marca;
}

export interface UnidadTransporte {
    unidadtransporteId?: string;
    descripcion: string;
    nro_matricula_cabina: string;
    modeloId: string | number;
    peso_maximo: number;
    certificado_inscripcion?: string;
    nro_matricula_carrosa1?: string;
    estado: string; // En tu código React era "1" o "0"
    modelo?: Modelo;
}