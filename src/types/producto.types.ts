// src/types/producto.types.ts

export interface SubClaseBien {
    subclasebienId: string;
    descripcion: string;
    clasebienId?: string; // Agregado según tu JSON
    estado?: boolean;
    observacion?: string;
    claseBien?: {
        descripcion?: string;
        estado?: boolean;
    };
}

export interface UnidadMedida {
    unidadmedidaId: string;
    abreviatura: string;
    descripcion: string;
}

export interface Producto {
    // Identificadores
    bienId: string;
    empresaId?: string;
    
    // Clasificación
    tipobienId: number; // En BD es int, en JSON es 2 (number)
    subclasebienId: string; // Corregido: antes era sub_clase_bienId
    unidadmedidaId: string;
    
    // Descripción y Detalles
    descripcion: string;
    marca?: string; // En BD es varchar, no ID
    codigo_existencia?: string;
    codigo_barra?: string;
    codigo_osce?: string;
    imagen?: string;
    observacion?: string;
    
    // Económico
    precio: number;
    costo: number;
    detraccion_porcentaje: number; // Corregido: antes era porcentaje_detraccion
    afecto_inafecto: boolean;      // Corregido: antes era aplica_detraccion
    
    // Configuración / Auditoría
    estado: boolean;
    condicion_estado?: string;
    emite_ticket?: boolean;
    
    // Relaciones (Foreign Keys directos)
    operacionesItemId?: string;
    operacionesitemId?: string;
    detraccionbienserviceId?: string;
    detraccionBienServiceId?: string;
    cuenta_contable?: string;
    cuentausuarioId?: string;
    cod_admin?: number; // En JSON viene como número (100001)
    ubidst?: string;

    // Objetos anidados (Vienen en el JSON, útiles para mostrar nombres en tablas)
    tipoBien?: { descripcion: string; estado: boolean };
    subClaseBien?: { descripcion: string; clasebienId?: string };
    subclaseBien?: { descripcion: string; estado?: boolean; clasebienId?: string };
    claseBien?: { descripcion: string; clasebienId?: string };
    unidadMedida?: { descripcion: string; abreviatura: string };

    // Tipo Afecto (operación/tributación). Viene en el GET ALL según el backend.
    operacionItem?: {
        descripcion?: string;
        valor?: number;
    };
    presentaciones?: Array<{
        presentacionId: string;
        descripcion: string;
        cantidad: number;
        estado: boolean;
        unidadmedidaId: string;
    }>;
    empresa?: {
        razon_social?: string;
        ruc?: string;
    };
    usuario?: {
        observacion?: string;
        usuario?: string;
        estado?: boolean;
    };
    perfiles?: {
        descripcion?: string;
        detalle?: string;
    };
    detraccionBienService?: {
        descripcion?: string;
    };
}

export interface ProductoCreateRequest {
    empresaId: string;
    descripcion: string;
    marca?: string | null;
    tipobienId?: number | null;
    precio?: number | null;
    costo?: number | null;
    subclasebienId?: string | null;
    unidadmedidaId: string;
    codigo_barra?: string | null;
    afecto_inafecto?: boolean | null;
    detraccion_porcentaje?: number | null;
    imagen?: string | null;
    cuentausuarioId?: string | null;
    observacion?: string | null;
    codigo_osce?: string | null;
    ubidst?: string | null;
    emite_ticket?: boolean | null;
    condicion_estado?: string | null;
    operacionesItemId?: string | null;
    detraccionbienserviceId?: string | null;
    cuenta_contable?: string | null;
}

export interface ProductoUpdateRequest extends Omit<ProductoCreateRequest, 'empresaId'> {
    codigo_existencia: string;
    empresaId?: string | null;
    cod_admin?: number | null;
}

export interface ProductoCreatedDto {
    bienId: string;
    codigo_existencia: string;
    cod_admin: number;
    presentacionId: string;
}

export interface ProductoUpdatedDto {
    bienId: string;
    empresaId: string;
    codigo_existencia: string;
    cod_admin: number;
    descripcion: string;
    unidadmedidaId: string;
}

export interface ApiResponse<T> {
    status?: number;      // Agregado según tu JSON
    isSuccess: boolean;
    message?: string;     // Agregado según tu JSON
    data: T;
    meta?: {
        totalRecords: number;
        totalPages: number;
        currentPage: number;
        pageSize: number;
    };
}
