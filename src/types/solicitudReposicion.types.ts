export interface SolicitudReposicionDetalle {
    item?: number;
    bienId: string;
    presentacionId: string;
    cantidad_solicitada: number;
    cantidad_atendida?: number;
    saldo_pendiente?: number;
    observacion?: string;

    bien?: {
        descripcion?: string;
    };

    presentacion?: {
        descripcion?: string;
    };
}

export interface SolicitudReposicionResponse {
    id: number;
    almacen_origenId?: string;
    almacen_destinoId: string;
    fecha_emision?: string;
    fecha_plazo_solicitud?: string;
    fecha_aprobacion?: string;
    estadoId: number;
    observacion?: string;
    cuentausuarioId: string;
    usuario_aprobacionId?: string;
    motivo_rechazo?: string;

    estado?: {
        nombre?: string;
        descripcion?: string;
    };

    almacenOrigen?: {
        sedeId?: string;
        descripcion?: string;
        direccion1?: string;
        direccion2?: string;
        estado?: boolean | number;
        tipoalmacenId?: string;
        sede?: {
            descripcion?: string;
            direccion?: string;
            telefono?: string;
            empresaId?: string;
            ubidst?: string;
            empresa?: {
                razon_social?: string;
                ruc?: string;
            };
            ubigeo?: {
                ubidep?: string;
                ubidsn?: string;
                nacionalidad?: string;
            };
        };
    };

    almacenDestino?: {
        sedeId?: string;
        descripcion?: string;
        direccion1?: string;
        direccion2?: string;
        estado?: boolean | number;
        tipoalmacenId?: string;
        sede?: {
            descripcion?: string;
            direccion?: string;
            telefono?: string;
            empresaId?: string;
            ubidst?: string;
            empresa?: {
                razon_social?: string;
                ruc?: string;
            };
            ubigeo?: {
                ubidep?: string;
                ubidsn?: string;
                nacionalidad?: string;
            };
        };
    };

    cuentaUsuario?: {
        observacion?: string;
        usuario?: string;
        correo?: string;
        perfilId?: string;
        estado?: boolean | number;
        perfil?: {
            descripcion?: string;
            detalle?: string;
        };
        empresa?: {
            razon_social?: string;
            ruc?: string;
        };
    };

    usuarioAprobacion?: {
        observacion?: string;
        usuario?: string;
        correo?: string;
        estado?: boolean | number;
        perfil?: {
            descripcion?: string;
            detalle?: string;
        };
        empresa?: {
            razon_social?: string;
            ruc?: string;
        };
    };

    total_items?: number;
    total_solicitado?: number;
    total_atendido?: number;
    total_pendiente?: number;
    indicador_pendiente?: boolean;

    detalles?: SolicitudReposicionDetalle[];
}

export interface SolicitudReposicionFilters {
    FechaInicio?: string;
    FechaFin?: string;

    FiltroEstado?: string[];
    FiltroAlmacenOrigen?: string[];
    FiltroAlmacenDestino?: string[];
    FiltroCuentaUsuario?: string[];
    FiltroUsuarioAprobacion?: string[];
    FiltroBien?: string[];
    FiltroPresentacion?: string[];
}

export interface SolicitudReposicionCreatePayload {
    almacen_origenId?: string | null;
    almacen_destinoId: string;
    fecha_plazo_solicitud: string;
    observacion?: string;
    cuentausuarioId: string;
    detalle: SolicitudReposicionDetallePayload[];
}

export interface SolicitudReposicionUpdatePayload {
    almacen_origenId?: string | null;
    fecha_plazo_solicitud: string;
    observacion?: string;
    detalle: SolicitudReposicionDetallePayload[];
}

export interface SolicitudReposicionDetallePayload {
    bienId: string;
    presentacionId: string;
    cantidad_solicitada: number;
    observacion?: string;
}

export interface SolicitudReposicionAprobarPayload {
    usuario_aprobacionId: string;
    AprobarDesaprobarEstado: boolean;
}

export interface SolicitudReposicionRechazarPayload {
    usuario_aprobacionId: string;
    motivo_rechazo: string;
}

export interface SolicitudReposicionAnularPayload {
    usuario_anulacionId?: string;
    motivo_anulacion: string;
}
