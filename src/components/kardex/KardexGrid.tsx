// src/components/kardex/KardexGrid.ts

// Columnas para Tab 1 (Presentación)
// 10 Columnas base
export const columnsKardexPres = [
    { header: 'Fecha', width: 105, render: (row: any) => row.fecha_emision_real ? new Date(row.fecha_emision_real).toLocaleDateString() : '-' },
    { header: 'Descripcion', key: 'transaccionDesc', width: 180 },
    { header: 'Nro Contenedor', key: 'nro_contenedor', width: 140 },
    { header: 'Documento', key: 'tipodoccomercial', width: 130 },
    { header: 'Observacion', key: 'observacion', width: 200 },
    { header: 'Tipo', key: 'tipomovimientoId', width: 80 },
    { header: 'Codigo', key: 'operacion', width: 110 },
    { header: 'Lote', key: 'MI_loteId', width: 120 },
    { header: 'Bien', key: 'bienDesc', width: 210 },
    { header: 'Presentacion', key: 'presentacionDesc', width: 180 },
    // GRUPO: ENTRADA
    { header: 'Cant', key: 'entrada_cantidad', width: 92, className: 'text-right font-semibold bg-green-50/50' },
    { header: 'Costo', key: 'entrada_costounitario', width: 92, className: 'text-right bg-green-50/50' },
    { header: 'Total', key: 'entrada_costototal', width: 96, className: 'text-right bg-green-50/50' },
    // GRUPO: SALIDA
    { header: 'Cant', key: 'salida_cantidad', width: 92, className: 'text-right font-semibold bg-red-50/50' },
    { header: 'Costo', key: 'salida_costounitario', width: 92, className: 'text-right bg-red-50/50' },
    { header: 'Total', key: 'salida_costototal', width: 96, className: 'text-right bg-red-50/50' },
    // GRUPO: SALDO
    { header: 'Cant', key: 'saldo_cantidad', width: 92, className: 'text-right font-bold bg-blue-50/50' },
    { header: 'Costo', key: 'saldo_costounitario', width: 92, className: 'text-right bg-blue-50/50' },
    { header: 'Total', key: 'saldo_costototal', width: 96, className: 'text-right bg-blue-50/50' },
];

// Columnas para Tab 3 (General / Empresa)
// IMPORTANTE: Quitamos "Periodo" de aquí, porque lo renderizaremos con RowSpan dinámico
// Ahora son 8 Columnas base
export const columnsKardexGral = [
    { header: 'Almacén', key: 'almacenABR' },
    { header: 'Sucursal', key: 'sucursal' },
    { header: 'Transacción', key: 'transaccionDesc' },
    { header: 'Documento', key: 'tipodoccomercial2' },
    { header: 'Codigo', key: 'cod_admin' },
    { header: 'Bien', key: 'bienDesc' },
    { header: 'U. Medida', key: 'unidadmedidaDesc' },
    { header: 'Fecha', render: (row: any) => row.fecha_emision_real ? new Date(row.fecha_emision_real).toLocaleDateString() : '-' },
    // GRUPO: ENTRADA (Mapeado a UndMin)
    { header: 'Cant', key: 'entrada_cantidad_UndMin', className: 'text-right font-semibold bg-green-50/50' },
    { header: 'C.U', key: 'entrada_costounitario_UndMin', className: 'text-right bg-green-50/50' },
    { header: 'Total', key: 'entrada_costototal_UndMin', className: 'text-right bg-green-50/50' },
    // GRUPO: SALIDA (Mapeado a UndMin)
    { header: 'Cant', key: 'salida_cantidad_UndMin', className: 'text-right font-semibold bg-red-50/50' },
    { header: 'C.U', key: 'salida_costounitario_UndMin', className: 'text-right bg-red-50/50' },
    { header: 'Total', key: 'salida_costototal_UndMin', className: 'text-right bg-red-50/50' },
    // GRUPO: SALDO (Mapeado a UndMin)
    { header: 'Cant', key: 'saldo_cantidad_UndMin', className: 'text-right font-bold bg-blue-50/50' },
    { header: 'C.U', key: 'saldo_costounitario_UndMin', className: 'text-right bg-blue-50/50' },
    { header: 'Total', key: 'saldo_costototal_UndMin', className: 'text-right bg-blue-50/50' },
];
