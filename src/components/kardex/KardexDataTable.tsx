// src/components/kardex/KardexDataTable.tsx
"use client";

// Función auxiliar para calcular el alto de la celda agrupada
const getRowSpan = (data: any[], currentIndex: number, key: string) => {
    let span = 1;
    for (let i = currentIndex + 1; i < data.length; i++) {
        if (data[i][key] === data[currentIndex][key]) {
            span++;
        } else {
            break;
        }
    }
    return span;
};

const getColumnWidth = (col: any, index: number, metricStartIndex: number) => {
    if (col.width) return col.width;
    if (index >= metricStartIndex) return 92;

    const label = String(col.header || col.key || '').toLowerCase();

    if (label.includes('fecha')) return 105;
    if (label.includes('tipo')) return 80;
    if (label.includes('lote')) return 105;
    if (label.includes('codigo')) return 115;
    if (label.includes('almac')) return 120;
    if (label.includes('sucursal')) return 135;
    if (label.includes('documento')) return 135;
    if (label.includes('contenedor')) return 140;
    if (label.includes('unidad') || label.includes('u. medida')) return 125;
    if (label.includes('observacion')) return 190;
    if (label.includes('descripcion') || label.includes('transacci') || label.includes('bien') || label.includes('presentacion')) return 185;

    return 140;
};

export default function KardexDataTable({ data, loading, columns, groupByPeriod = false }: any) {
    const metricColumnsCount = 9; // Entrada, Salida y Saldo tienen 3 columnas cada uno.
    const periodColumnWidth = 120;
    const baseColumnsCount = columns.length - metricColumnsCount;
    const leadingColumnsSpan = baseColumnsCount + (groupByPeriod ? 1 : 0);
    const metricStartIndex = Math.max(columns.length - metricColumnsCount, 0);
    const columnWidths = columns.map((col: any, index: number) => getColumnWidth(col, index, metricStartIndex));
    const totalWidthWeight = columnWidths.reduce((total: number, width: number) => total + width, groupByPeriod ? periodColumnWidth : 0);

    return (
        <div className="relative border border-slate-300 rounded-lg overflow-hidden bg-white shadow-sm mt-6">
            <div className="overflow-x-hidden custom-scrollbar max-h-[calc(100vh-350px)]">
                <table className="w-full table-fixed border-collapse text-[10px] sm:text-[11px]">
                    <colgroup>
                        {groupByPeriod && <col style={{ width: `${(periodColumnWidth / totalWidthWeight) * 100}%` }} />}
                        {columnWidths.map((width: number, index: number) => (
                            <col key={index} style={{ width: `${(width / totalWidthWeight) * 100}%` }} />
                        ))}
                    </colgroup>
                    <thead className="bg-[#59696A] text-white sticky top-0 z-20">
                        {/* Fila de Grupos Superior */}
                        <tr>
                            <th colSpan={leadingColumnsSpan} className="bg-white border-b border-r border-slate-300"></th>
                            <th colSpan={3} className="py-2 px-1 border-b border-r border-slate-400 text-center uppercase font-bold tracking-wider">Entrada</th>
                            <th colSpan={3} className="py-2 px-1 border-b border-r border-slate-400 text-center uppercase font-bold tracking-wider">Salida</th>
                            <th colSpan={3} className="py-2 px-1 border-b text-center uppercase font-bold tracking-wider">Saldo</th>
                        </tr>
                        {/* Fila de Cabeceras Reales */}
                        <tr className="bg-slate-100 text-slate-600">
                            {/* Cabecera manual del periodo si aplica */}
                            {groupByPeriod && (
                                <th className="py-2 px-1.5 border-b border-r border-slate-300 text-left uppercase font-bold bg-slate-200 whitespace-normal break-words leading-tight">
                                    PERÍODO
                                </th>
                            )}
                            
                            {columns.map((col: any, i: number) => (
                                <th key={i} className={`py-2 px-1.5 border-b border-r border-slate-300 text-left uppercase font-bold whitespace-normal break-words leading-tight ${col.className || ''}`}>
                                    {col.header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {loading ? (
                            <tr><td colSpan={columns.length + (groupByPeriod ? 1 : 0)} className="py-10 text-center italic">Cargando movimientos...</td></tr>
                        ) : data.length > 0 ? (
                            data.map((row: any, rowIndex: number) => {
                                
                                // Lógica de cálculo para el RowSpan
                                const isFirstInGroup = groupByPeriod && (rowIndex === 0 || row.periodoAgrupado !== data[rowIndex - 1].periodoAgrupado);
                                const rowSpan = isFirstInGroup ? getRowSpan(data, rowIndex, 'periodoAgrupado') : 0;

                                return (
                                    <tr key={rowIndex} className="hover:bg-blue-50/50 transition-colors">
                                        
                                        {/* Renderizado de la Celda Agrupada (Solo si es la primera del grupo) */}
                                        {groupByPeriod && isFirstInGroup && (
                                            <td 
                                                rowSpan={rowSpan} 
                                                // CORRECCIÓN: align-middle lo centra verticalmente, text-center horizontalmente
                                                className="px-1.5 py-2 border-r border-b border-slate-300 font-bold text-slate-700 bg-slate-50 align-middle text-center whitespace-normal break-words"
                                                style={{ overflowWrap: 'anywhere' }} 
                                            >
                                                {row.periodoAgrupado}
                                            </td>
                                        )}

                                        {/* Renderizado del resto de columnas normales */}
                                        {columns.map((col: any, colIndex: number) => (
                                            <td
                                                key={colIndex}
                                                className={`px-1.5 py-2 border-r border-slate-100 last:border-r-0 align-top whitespace-normal break-words leading-snug ${col.className || ''}`}
                                                style={{ overflowWrap: 'anywhere' }}
                                            >
                                                {col.render ? col.render(row) : 
                                                 (typeof row[col.key] === 'number' ? 
                                                  row[col.key].toLocaleString('es-PE', { minimumFractionDigits: 2 }) : 
                                                  row[col.key] || '-')}
                                            </td>
                                        ))}
                                    </tr>
                                );
                            })
                        ) : (
                            <tr><td colSpan={columns.length + (groupByPeriod ? 1 : 0)} className="py-10 text-center text-slate-400">No hay movimientos registrados</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
