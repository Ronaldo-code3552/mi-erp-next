// src/services/reporteService.ts
import apiClient from '@/api/apiCliente';
import { 
    ReporteStock, ReporteKardexValorizado, ReportesPendientesRequest, 
    ReporteVentasMesRequest, ReporteVentasSedeRequest, ReporteFiltroRequest, 
    ReporteRotacionInventarioRequest, ReporteTransaccionesRequest 
} from '@/types/reporte.types';

const downloadBlob = (blob: Blob, filename: string) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
    window.URL.revokeObjectURL(url);
};

// Helper genérico para peticiones POST de Blob
const postBlob = async (url: string, data: any, filename: string) => {
    const response = await apiClient.post(url, data, { responseType: 'blob' });
    downloadBlob(new Blob([response.data]), filename);
};

export const reporteService = {
    // 1 & 2. STOCKS Y KARDEX
    descargarStockExcel: (data: ReporteStock) => postBlob('/ReporteStock/excel', data, 'ReporteStock.xlsx'),
    descargarKardexExcel: (data: ReporteKardexValorizado) => postBlob('/ReporteStock/kardex-valorizado-excel', data, 'ReporteKardexValorizado.xlsx'),

    // BLOQUE A: PENDIENTES (3, 4, 5, 6)
    descargarVentasPendientes: (data: ReportesPendientesRequest) => postBlob('/ReporteStock/ventas-pendientes-despacho', data, 'Ventas_Pendientes_Despacho.xlsx'),
    descargarComprasPendientes: (data: ReportesPendientesRequest) => postBlob('/ReporteStock/compras-pendientes-ingreso', data, 'Compras_Pendientes_Ingreso.xlsx'),
    descargarGuiasSalida: (data: ReportesPendientesRequest) => postBlob('/ReporteStock/guias-pendientes-salida', data, 'Guias_Traslado_Salida.xlsx'),
    descargarGuiasIngreso: (data: ReportesPendientesRequest) => postBlob('/ReporteStock/guias-pendientes-ingreso', data, 'Guias_Traslado_Ingreso.xlsx'),

    // BLOQUE B: VENTAS Y ROTACIÓN (7, 8, 9, 10, 11, 12)
    descargarVentasMes: (data: ReporteVentasMesRequest) => postBlob('/ReporteStock/ventas-por-mes', data, 'RotacionDeVentasPorMes.xlsx'),
    descargarVentasSede: (data: ReporteVentasSedeRequest) => postBlob('/ReporteStock/ventas-por-sede', data, 'Ventas_Sede.xlsx'),
    descargarRotacionDetallada: (data: ReporteFiltroRequest) => postBlob('/ReporteStock/rotacion-detallada', data, 'RotacionDetallada.xlsx'),
    descargarTrasladosAlmacen: (data: ReporteFiltroRequest) => postBlob('/ReporteStock/traslados-almacen', data, 'TrasladosAlmacen.xlsx'),
    descargarDistribucionTransporte: (data: ReporteFiltroRequest) => postBlob('/ReporteStock/distribucion-transportes', data, 'DistribucionTransportes.xlsx'),
    descargarRotacionInventario: (data: ReporteRotacionInventarioRequest) => postBlob('/ReporteStock/rotacion-inventario', data, 'RotacionInventario.xlsx'),

    // BLOQUE C: MAESTROS (13, 14)
    descargarTransaccionesKardex: (data: ReporteTransaccionesRequest) => postBlob('/ReporteStock/transacciones-kardex', data, 'Reporte_Kardex_Transacciones.xlsx'),
    
    // El 14 es un GET
    descargarListaProductos: async (empresaId: string) => {
        const response = await apiClient.get(`/ReporteStock/lista-productos/${empresaId}`, { responseType: 'blob' });
        downloadBlob(new Blob([response.data]), `Lista_de_Bienes_${empresaId}.xlsx`);
    }
};