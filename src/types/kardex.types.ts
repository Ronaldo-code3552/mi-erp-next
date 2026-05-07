// src/types/kardex.types.ts

export interface MovimientoInventarioDto {
    movinventarioId?: string;
    fecha_emision_real?: string;
    transaccionId?: string;
    transaccionDesc?: string;
    nro_contenedor?: string;
    tipodoccomercial?: string;
    observacion?: string;
    tipomovimientoId?: string;
    operacion?: string;
    MI_loteId?: string;
    bienDesc?: string;
    presentacionDesc?: string;
    entrada_cantidad?: number;
    entrada_costounitario?: number;
    entrada_costototal?: number;
    salida_cantidad?: number;
    salida_costounitario?: number;
    salida_costototal?: number;
    saldo_cantidad?: number;
    saldo_costounitario?: number;
    saldo_costototal?: number;
    Estraslado?: string;
}

export interface SaldosKardexDto {
    stockReal: number;
    stockDisponible: number;
    stockFuturo: number;
}

export interface KardexFilterRequest {
    bienId?: string;
    presentacionId?: string;
    fechaInicial: string;
    fechaFinal: string;
    lote?: string;
    almacenId: string;
}

export interface MovimientoEmpresaDto {
    movinventarioId?: string;
    fecha_emision_real?: string;
    mes?: string;
    almacenABR?: string;
    sucursal?: string;
    transaccionDesc?: string;
    tipodoccomercial2?: string;
    cod_admin?: string;
    bienDesc?: string;
    unidadmedidaDesc?: string;
    entrada_cantidad_UndMin?: number;
    salida_cantidad_UndMin?: number;
    saldo_cantidad_UndMin?: number;
}

export interface KardexEmpresaRequest {
    empresaId?: string;
    bienId?: string;
    fechaInicial: string;
    fechaFinal: string;
    agrupamiento?: string;
}

// El backend devuelve un diccionario agrupado por mes/trimestre
export type KardexEmpresaResponse = Record<string, MovimientoEmpresaDto[]>;
