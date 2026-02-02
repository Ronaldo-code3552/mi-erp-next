export interface Conductor {
    conductortransporteId?: string; // UUID o ID del backend
    nombres: string;
    apellidos: string;
    docidentId: string;
    nro_licencia: string;
    nro_documento: string;
    licencia_conducir?: string;
    telefono_movil?: string;
    direccion?: string;
    estado: boolean;
    empresaId: string;
}