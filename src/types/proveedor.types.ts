import { CuentaProveedor } from './cuentasProveedor.types';

export interface ProveedorTipoProveedor {
    descripcion?: string;
    estado?: boolean;
}

export interface ProveedorClaseProveedor {
    descripcion?: string;
    estado?: boolean;
}

export interface ProveedorDocumentoIdentidad {
    descripcion_larga?: string;
    descripcion_corta?: string;
    descripcion?: string;
    abreviatura?: string;
    estado?: boolean;
}

export interface ProveedorTenant {
    descripcion?: string;
    dominio?: string;
    estadoId?: number;
}

export interface ProveedorUbigeo {
    ubipai?: string;
    ubipan?: string;
    ubidep?: string;
    ubiden?: string;
    ubiprv?: string;
    ubiprn?: string;
    ubidst?: string;
    ubidsn?: string;
    nacionalidad?: string;
    estado?: string;
}

export interface Proveedor {
    ProveedorId?: string;
    proveedorId?: string;
    TipoproveedorId?: string;
    tipoproveedorId?: string;
    ClaseproveedorId?: number | string | null;
    claseproveedorId?: number | string | null;
    Descripcion?: string;
    descripcion?: string;
    DocidentId?: string;
    docidentId?: string;
    NumeroDoc?: string;
    numeroDoc?: string;
    numero_doc?: string;
    Direccion?: string;
    direccion?: string;
    TelefonoFijo?: string;
    telefonoFijo?: string;
    telefono_fijo?: string;
    TelefonoFijo2?: string;
    telefonoFijo2?: string;
    telefono_fijo2?: string;
    TelefonoMovil?: string;
    telefonoMovil?: string;
    telefono_movil?: string;
    TelefonoMovil2?: string;
    telefonoMovil2?: string;
    telefono_movil2?: string;
    FechaNacimiento?: string | null;
    fechaNacimiento?: string | null;
    fecha_nacimiento?: string | null;
    Email?: string;
    email?: string;
    Website?: string;
    website?: string;
    Estado?: boolean | null;
    estado?: boolean | null;
    Ubidst?: string;
    ubidst?: string;
    TenantId?: string | number;
    tenantId?: string | number;
    tipoProveedor?: ProveedorTipoProveedor;
    tipo_proveedor?: ProveedorTipoProveedor;
    claseProveedor?: ProveedorClaseProveedor;
    clase_proveedor?: ProveedorClaseProveedor;
    documentoIdentidad?: ProveedorDocumentoIdentidad;
    documento_identidad?: ProveedorDocumentoIdentidad;
    tenant?: ProveedorTenant;
    ubigeo?: ProveedorUbigeo;
    Ubigeo?: ProveedorUbigeo;
    cuentasProveedor?: CuentaProveedor[];
    CuentasProveedor?: CuentaProveedor[];
}

export interface ProveedorPayload {
    proveedorId?: string;
    tipoproveedorId?: string;
    claseproveedorId?: number | string | null;
    descripcion: string;
    docidentId?: string;
    numeroDoc?: string;
    direccion?: string;
    telefonoFijo?: string;
    telefonoFijo2?: string;
    telefonoMovil?: string;
    telefonoMovil2?: string;
    fechaNacimiento?: string | null;
    email?: string;
    website?: string;
    estado?: boolean | null;
    ubidst?: string;
    tenantId?: string | number;
}

export interface ProveedorCreatePayload {
    ProveedorId?: string;
    TipoproveedorId?: string;
    ClaseproveedorId?: number | null;
    Descripcion?: string;
    DocidentId?: string;
    NumeroDoc?: string;
    Direccion?: string;
    TelefonoFijo?: string;
    TelefonoFijo2?: string;
    TelefonoMovil?: string;
    TelefonoMovil2?: string;
    FechaNacimiento?: string | null;
    Email?: string;
    Website?: string;
    Estado?: boolean;
    Ubidst?: string;
}

export interface ProveedorUpdatePayload {
    ClaseproveedorId?: number | null;
    Direccion?: string;
    TelefonoFijo?: string;
    TelefonoFijo2?: string;
    TelefonoMovil?: string;
    TelefonoMovil2?: string;
    FechaNacimiento?: string | null;
    Email?: string;
    Website?: string;
    Ubidst?: string;
}

export interface ProveedorFilters {
    estado?: Array<string | number>;
    docidentId?: Array<string | number>;
    tipoproveedorId?: Array<string | number>;
    claseproveedorId?: Array<string | number>;
}

export interface ProveedorDropdownItem {
    [key: string]: unknown;
}
