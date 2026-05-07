// src/types/reporte.types.ts

export interface ReporteStock {
    empresaId: string;
    tipoAlmacen: number;
    tipoReporte: string;
    almacenId: string;
}

export interface ReporteKardexValorizado {
    empresaId: string;
    almacenId?: string;
    tipo: string;
    desdeFecha: string; // Formato ISO o YYYY-MM-DD para que .NET lo parsee a DateTime
    hastaFecha: string;
}


// src/types/reporte.types.ts

export interface ReporteStock {
    empresaId: string;
    tipoAlmacen: number;
    tipoReporte: string;
    almacenId: string;
}

export interface ReporteKardexValorizado {
    empresaId: string;
    almacenId?: string;
    tipo: string;
    desdeFecha: string; 
    hastaFecha: string;
}

export interface ReportesPendientesRequest {
    empresaId: string;
    desdeFecha: string;
    hastaFecha: string;
}

export interface ReporteVentasMesRequest {
    empresaId: string;
    desdeFecha: string;
    hastaFecha: string;
    incluyeDocsInternos: boolean;
}

export interface ReporteVentasSedeRequest {
    empresaId: string;
    sedeId: string;
    desdeFecha: string;
    hastaFecha: string;
}

export interface ReporteFiltroRequest {
    almacenId: string;
    desdeFecha: string;
    hastaFecha: string;
}

export interface ReporteRotacionInventarioRequest {
    empresaId: string;
    desdeFecha: string;
    hastaFecha: string;
}

export interface ReporteTransaccionesRequest {
    empresaId: string;
    almacenId: string;
    transaccionId: string;
    desdeFecha: string;
    hastaFecha: string;
}