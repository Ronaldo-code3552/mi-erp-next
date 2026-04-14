// src/components/forms/ImportarDocumentoModal.tsx
"use client";
import React, { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import { IconSearch, IconDownload, IconEye, IconLoader, IconPackage } from '@tabler/icons-react';
import { toast } from 'sonner';
import { format, subMonths } from 'date-fns';

import { documentoCompraService } from '@/services/documentoCompraService';
import { guiaRemisionService } from '@/services/guiaRemisionService';
import documentoVentaService from '@/services/documentoVentaService';

interface ImportarDocumentoModalProps {
    isOpen: boolean;
    onClose: () => void;
    empresaId: string;
    transaccionRules: {
        filtrosVenta: any; 
        allowedDocTypes: string[];
        tipoCompraFiltro?: string | null; 
        filtrosGuia?: any | null;
        isBonificacion?: boolean; // 🚀 REGLA PARA SABER SI LLAMAMOS AL ENDPOINT SB
        isSalidaVenta?: boolean;  // 🚀 REGLA PARA SABER SI LLAMAMOS AL ENDPOINT SV
        isConsignacion?: boolean; // 🚀 AGREGAR AQUÍ
    };
    catalogoTiposDoc: any[];
    onImport: (cabecera: any, detalles: any[]) => void;
    soloStock?: boolean;
}

export default function ImportarDocumentoModal({ 
    isOpen, onClose, empresaId, transaccionRules, catalogoTiposDoc, onImport, soloStock = false 
}: ImportarDocumentoModalProps) {
    
    const [tipoDocId, setTipoDocId] = useState('');
    const [fechaInicio, setFechaInicio] = useState(format(subMonths(new Date(), 1), 'yyyy-MM-dd'));
    const [fechaFin, setFechaFin] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [searchTerm, setSearchTerm] = useState('');
    
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [totalRecords, setTotalRecords] = useState(0);
    const pageSize = 20;

    const [detailModalOpen, setDetailModalOpen] = useState(false);
    const [loadingDetail, setLoadingDetail] = useState(false);
    const [selectedDocData, setSelectedDocData] = useState<any | null>(null);

    const allowedDocTypes = Array.isArray(transaccionRules?.allowedDocTypes) ? transaccionRules.allowedDocTypes : [];

    const docOptions = catalogoTiposDoc
        .filter(d => allowedDocTypes.includes(String(d.value).trim()))
        .map(d => ({ key: d.value, value: d.value, label: d.label }));

    const esGuiaActual = ['X031', 'X029'].includes(tipoDocId);
    const esNotaCredito = ['X037', 'X077'].includes(tipoDocId); 
    const esVentaGlobal = ['X037', 'X077', 'X038', 'X028', 'X007', 'X066'].includes(tipoDocId);

    useEffect(() => {
        setPage(1);
    }, [searchTerm, tipoDocId, fechaInicio, fechaFin]);

    useEffect(() => {
        if (!tipoDocId) {
            setData([]);
            setTotalRecords(0);
            return;
        }

        const delayDebounceFn = setTimeout(() => {
            ejecutarBusqueda(page);
        }, 500);

        return () => clearTimeout(delayDebounceFn);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchTerm, tipoDocId, fechaInicio, fechaFin, page]); 

    const ejecutarBusqueda = async (pageToFetch: number) => {
        setLoading(true);
        try {
            let res: any;

            if (esNotaCredito) {
                // 🚀 CASO: DEVOLUCIÓN DE VENTAS (DV)
                const filtrosVenta: any = {
                    tipoDocumento: [tipoDocId], // ✅ Corregido a minúscula
                    fechaInicio: fechaInicio,
                    fechaFin: fechaFin
                };

                if (transaccionRules.filtrosVenta) Object.assign(filtrosVenta, transaccionRules.filtrosVenta);

                const responseVenta = await documentoVentaService.getNotasCreditoPendientes(
                    empresaId, pageToFetch, pageSize, searchTerm, filtrosVenta, soloStock
                );
                
                res = { isSuccess: true, data: responseVenta.data, totalRecords: responseVenta.meta?.totalRecords || 0 };

            } else if (transaccionRules.isBonificacion || transaccionRules.isSalidaVenta || transaccionRules.isConsignacion) { 
                // 🚀 ¡AQUÍ ESTÁ EL ARREGLO! Agregamos isConsignacion al IF
                
                // 🚀 CASO: SALIDAS POR VENTA (SV), BONIFICACIÓN (SB) Y CONSIGNACIÓN (CG)
                const filtrosVenta: any = {
                    tipoDocumento: [tipoDocId], // ✅ Corregido a minúscula
                    fechaInicio: fechaInicio,
                    fechaFin: fechaFin
                };

                if (transaccionRules.filtrosVenta) Object.assign(filtrosVenta, transaccionRules.filtrosVenta);

                if (transaccionRules.isBonificacion) {
                    const responseSB = await documentoVentaService.getBonificacionesByEmpresa(
                        empresaId, pageToFetch, pageSize, searchTerm, filtrosVenta, soloStock
                    );
                    res = { isSuccess: true, data: responseSB.data, totalRecords: responseSB.meta?.totalRecords || 0 };
                } else {
                    // 🚀 SV Y CG USAN EL ENDPOINT GENERAL, LAS BANDERAS HACEN EL TRABAJO
                    const responseSV = await documentoVentaService.getByEmpresa(
                        empresaId, pageToFetch, pageSize, searchTerm, filtrosVenta, soloStock
                    );
                    res = { isSuccess: true, data: responseSV.data, totalRecords: responseSV.meta?.totalRecords || 0 };
                }

            } else {
                // 🚀 CASOS: COMPRAS Y GUÍAS (COMO ANTES)
                const filtrosParaBackend: any = {
                    tipo_documento: [tipoDocId],
                    fecha_inicio: fechaInicio,
                    fecha_fin: fechaFin
                };

                if (!esGuiaActual && transaccionRules.tipoCompraFiltro) {
                    filtrosParaBackend.tipo_compra = transaccionRules.tipoCompraFiltro;
                    filtrosParaBackend.estados_excluidos = ['COMPROMETIDO', 'ANULADO'];
                }

                if (esGuiaActual && transaccionRules.filtrosGuia) {
                    Object.assign(filtrosParaBackend, transaccionRules.filtrosGuia);
                }

                if (esGuiaActual) {
                    res = await guiaRemisionService.getDisponiblesByEmpresa(
                        empresaId, pageToFetch, pageSize, searchTerm, filtrosParaBackend, soloStock
                    );
                } else {
                    res = await documentoCompraService.getDisponiblesByEmpresa(
                        empresaId, pageToFetch, pageSize, searchTerm, filtrosParaBackend, soloStock
                    );
                }
            }

            if (res && (res.isSuccess || Array.isArray(res.data))) {
                setData(res.data || []);
                setTotalRecords(res.meta?.totalRecords || (res as any).totalRecords || (res.data || []).length);
            } else {
                toast.error(res?.message || "Error al buscar documentos");
            }
        } catch (error) {
            console.error("Error en búsqueda:", error);
            toast.error("Error de conexión");
        } finally {
            setLoading(false);
        }
    };

    const handleViewDetail = async (doc: any) => {
        const docId = esGuiaActual 
            ? doc.guiasremisionId 
            : (esVentaGlobal ? doc.documentoventaId : doc.documentocompraId);

        if (!docId) return toast.error("No se pudo identificar el ID del documento.");

        setLoadingDetail(true);
        setDetailModalOpen(true); 

        try {
            let docData = null;

            if (esGuiaActual) {
                const res = await guiaRemisionService.getById(docId);
                if (res.isSuccess) docData = res.data;
            } else if (esVentaGlobal) {
                docData = await documentoVentaService.getById(docId);
            } else {
                const res = await documentoCompraService.getById(docId);
                if (res.isSuccess) docData = res.data;
            }

            if (docData) {
                setSelectedDocData({ ...docData, isGuia: esGuiaActual, isVenta: esVentaGlobal });
            } else {
                toast.error("No se pudo cargar el detalle del documento.");
                setDetailModalOpen(false);
            }
        } catch (error) {
            toast.error("Error al obtener los detalles.");
            setDetailModalOpen(false);
        } finally {
            setLoadingDetail(false);
        }
    };

    const handleSelectDocument = async (doc: any) => {
        const docId = esGuiaActual 
            ? doc.guiasremisionId 
            : (esVentaGlobal ? doc.documentoventaId : doc.documentocompraId);

        if (!docId) return toast.error("No se pudo identificar el ID del documento.");

        try {
            let docData = null;

            if (esGuiaActual) {
                const res = await guiaRemisionService.getById(docId);
                if (res.isSuccess) docData = res.data;
            } else if (esVentaGlobal) {
                docData = await documentoVentaService.getById(docId);
            } else {
                const res = await documentoCompraService.getById(docId);
                if (res.isSuccess) docData = res.data;
            }

            if (docData) {
                onImport(docData, docData.detalles || []);
            } else {
                toast.error("Error al traer los detalles para la importación.");
            }
        } catch (error) {
            toast.error("Error de red al importar.");
        }
    };

    const totalPages = Math.ceil(totalRecords / pageSize);
    const entidadDescripcionDetalle = selectedDocData?.proveedor?.descripcion || selectedDocData?.cliente?.descripcion || 'Sin Especificar';
    const entidadDocumentoDetalle = selectedDocData?.proveedor?.numero_doc || selectedDocData?.proveedor?.numDocIdent || selectedDocData?.cliente?.numero_doc || selectedDocData?.cliente?.numDocIdent || '';

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} title="Importar Documento" size="lg">
                <div className="p-5 space-y-5">
                    {/* Filtros */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                        <div className="md:col-span-2">
                            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Tipo Documento</label>
                            <select 
                                className="w-full border p-2 rounded-lg text-xs outline-none focus:border-blue-500 bg-white"
                                value={tipoDocId} onChange={(e) => setTipoDocId(e.target.value)}
                            >
                                <option value="">-- Seleccione --</option>
                                {docOptions.map(o => <option key={o.key} value={o.value}>{o.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Desde</label>
                            <input 
                                type="date" 
                                className="w-full border p-2 rounded-lg text-xs outline-none focus:border-blue-500 bg-white"
                                value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Hasta</label>
                            <input 
                                type="date" 
                                className="w-full border p-2 rounded-lg text-xs outline-none focus:border-blue-500 bg-white"
                                value={fechaFin} onChange={(e) => setFechaFin(e.target.value)}
                            />
                        </div>
                        <div className="md:col-span-4">
                            <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Buscar por Serie, Número o Entidad</label>
                            <div className="relative">
                                <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input 
                                    type="text" placeholder="Escriba para buscar..."
                                    className="w-full pl-9 pr-3 py-2 rounded-lg text-xs outline-none focus:border-blue-500 bg-white border border-slate-300"
                                    value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                                />
                                {loading && <IconLoader className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-500 animate-spin" size={16} />}
                            </div>
                        </div>
                    </div>

                    {/* Tabla de Resultados */}
                    <div className="border rounded-xl overflow-hidden h-[300px] flex flex-col bg-white">
                        <div className="flex-1 overflow-y-auto">
                            <table className="w-full text-left text-xs">
                                <thead className="bg-slate-100 text-slate-600 sticky top-0 shadow-sm z-10">
                                    <tr>
                                        <th className="p-3">Documento</th>
                                        <th className="p-3">Fecha</th>
                                        {esGuiaActual ? (
                                            <>
                                                <th className="p-3">Origen / Destino</th>
                                                <th className="p-3 text-center">Estado</th>
                                            </>
                                        ) : (
                                            <>
                                                <th className="p-3">Proveedor / Cliente</th>
                                                <th className="p-3 text-right">Total Documento</th>
                                            </>
                                        )}
                                        <th className="p-3 text-center">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {!tipoDocId ? (
                                        <tr>
                                            <td colSpan={5} className="p-8 text-center text-slate-400 italic">
                                                Seleccione un Tipo de Documento para buscar.
                                            </td>
                                        </tr>
                                    ) : data.length === 0 && !loading ? (
                                        <tr>
                                            <td colSpan={5} className="p-8 text-center text-slate-400 italic">
                                                No se encontraron documentos disponibles.
                                            </td>
                                        </tr>
                                    ) : (
                                        data.map((doc, idx) => {
                                            const docNumber = doc.numero || doc.correlativo || '';
                                            const serie = doc.serie || '';
                                            const docName = `${serie}-${docNumber}`;
                                            const fecha = doc.fecha_doc || doc.fecha_emision || '';
                                            const estadoDoc = doc.estado || 'PENDIENTE';

                                            const provName = doc.proveedor?.descripcion || doc.cliente?.descripcion || doc.clienteDesc || doc.proveedornombre || 'Sin Entidad';
                                            const monto = Number(doc.total || doc.saldo || 0).toFixed(2);
                                            const origen = doc.almacenInicio?.descripcion || doc.punto_partida || 'N/A';
                                            const destino = doc.almacenDestino?.descripcion || doc.punto_llegada || 'N/A';

                                            return (
                                                <tr key={idx} className="hover:bg-slate-50 transition-colors">
                                                    <td className="p-3 font-mono font-bold text-slate-700">{docName}</td>
                                                    <td className="p-3 text-slate-600">{fecha ? format(new Date(fecha), 'dd/MM/yyyy') : ''}</td>
                                                    
                                                    {esGuiaActual ? (
                                                        <>
                                                            <td className="p-3 text-slate-600">
                                                                <span className="block font-bold text-[10px] text-slate-400">DE: {origen}</span>
                                                                <span className="block font-bold text-[10px] text-slate-700">A: {destino}</span>
                                                            </td>
                                                            <td className="p-3 text-center font-bold text-[10px] text-slate-500">{estadoDoc}</td>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <td className="p-3 text-slate-600 truncate max-w-[200px]" title={provName}>{provName}</td>
                                                            <td className="p-3 text-right font-semibold text-blue-600">{monto}</td>
                                                        </>
                                                    )}

                                                    <td className="p-3 text-center">
                                                        <div className="flex justify-center items-center gap-2">
                                                            <button 
                                                                onClick={() => handleViewDetail(doc)}
                                                                title="Ver Detalles"
                                                                className="p-1.5 bg-amber-50 text-amber-600 rounded hover:bg-amber-100 transition-colors border border-amber-200"
                                                            >
                                                                <IconEye size={16} />
                                                            </button>
                                                            <button 
                                                                onClick={() => handleSelectDocument(doc)}
                                                                title="Importar a la Nota"
                                                                className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 rounded font-bold hover:bg-blue-100 transition-colors border border-blue-200"
                                                            >
                                                                <IconDownload size={14} /> Importar
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* CONTROLES DE PAGINACIÓN */}
                    {totalRecords > 0 && (
                        <div className="flex justify-between items-center bg-slate-50 p-2 rounded-lg border border-slate-200 text-xs text-slate-600">
                            <span>Mostrando página <strong>{page}</strong> de <strong>{totalPages}</strong> ({totalRecords} resultados)</span>
                            <div className="flex gap-1">
                                <button 
                                    disabled={page === 1} 
                                    onClick={() => setPage(p => p - 1)}
                                    className="px-3 py-1 bg-white border rounded hover:bg-slate-100 disabled:opacity-50"
                                >
                                    Anterior
                                </button>
                                <button 
                                    disabled={page >= totalPages} 
                                    onClick={() => setPage(p => p + 1)}
                                    className="px-3 py-1 bg-white border rounded hover:bg-slate-100 disabled:opacity-50"
                                >
                                    Siguiente
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end pt-2 border-t">
                        <button onClick={onClose} className="px-5 py-2 bg-slate-200 rounded-lg font-bold text-slate-700 hover:bg-slate-300">Cerrar</button>
                    </div>
                </div>
            </Modal>

            {/* SEGUNDO MODAL: VISTA DE DETALLES DEL DOCUMENTO */}
            <Modal isOpen={detailModalOpen} onClose={() => setDetailModalOpen(false)} title="Detalle del Documento" size="lg">
                <div className="p-5">
                    {loadingDetail || !selectedDocData ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                            <IconLoader size={40} className="animate-spin text-blue-500 mb-4" />
                            <p className="font-bold animate-pulse">Cargando información completa...</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                                <div>
                                    <p className="font-bold text-slate-400 uppercase mb-1">Documento</p>
                                    <p className="font-mono font-bold text-slate-800 text-sm">
                                        {selectedDocData.tipoDocumentoComercial?.abreviatura || 'DOC'} {selectedDocData.serie}-{selectedDocData.numero || selectedDocData.correlativo}
                                    </p>
                                </div>
                                <div>
                                    <p className="font-bold text-slate-400 uppercase mb-1">Fecha</p>
                                    <p className="font-semibold text-slate-700">
                                        {selectedDocData.fecha_emision ? format(new Date(selectedDocData.fecha_emision), 'dd/MM/yyyy HH:mm') : '-'}
                                    </p>
                                </div>
                                <div className="md:col-span-2">
                                    <p className="font-bold text-slate-400 uppercase mb-1">Entidad (Proveedor/Cliente)</p>
                                    <p className="font-bold text-slate-800 truncate" title={entidadDescripcionDetalle}>
                                        {entidadDocumentoDetalle ? `${entidadDocumentoDetalle} - ` : ''}{entidadDescripcionDetalle}
                                    </p>
                                </div>
                                {!selectedDocData.isGuia && (
                                    <>
                                        <div>
                                            <p className="font-bold text-slate-400 uppercase mb-1">Moneda</p>
                                            <p className="font-semibold text-slate-700">{selectedDocData.moneda?.descripcion || '-'}</p>
                                        </div>
                                        <div>
                                            <p className="font-bold text-slate-400 uppercase mb-1">Tipo Pago</p>
                                            <p className="font-semibold text-slate-700">{selectedDocData.tipoPago?.descripcion || '-'}</p>
                                        </div>
                                        <div className="md:col-span-2 text-right">
                                            <p className="font-bold text-slate-400 uppercase mb-1">Total Documento</p>
                                            <p className="font-black text-blue-600 text-lg">
                                                {selectedDocData.moneda?.abreviatura === 'D' ? '$ ' : 'S/ '} {Number(selectedDocData.total).toFixed(2)}
                                            </p>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div>
                                <div className="flex items-center gap-2 text-slate-800 mb-3">
                                    <IconPackage className="text-slate-500" size={18} />
                                    <h3 className="font-bold text-sm uppercase">Productos Incluidos</h3>
                                </div>
                                <div className="border rounded-xl overflow-hidden max-h-[300px] overflow-y-auto">
                                    <table className="w-full text-left text-xs">
                                        <thead className="bg-slate-100 text-slate-600 sticky top-0 shadow-sm">
                                            <tr>
                                                <th className="p-3 w-10">#</th>
                                                <th className="p-3">Producto</th>
                                                <th className="p-3">Presentación</th>
                                                <th className="p-3 text-right">Cant. Total</th>
                                                <th className="p-3 text-right text-emerald-600">Saldo Pendiente</th>
                                                {!selectedDocData.isGuia && (
                                                    <>
                                                        <th className="p-3 text-right">Precio U.</th>
                                                        <th className="p-3 text-right">Importe</th>
                                                    </>
                                                )}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {(selectedDocData.detalles || []).map((det: any, i: number) => {
                                                const cant = Number(det.cantidad || 0);
                                                const saldo = Number(det.saldoTemporal ?? det.saldo_temporal ?? det.saldoCantidad ?? det.saldo_cantidad ?? cant);
                                                
                                                return (
                                                    <tr key={i} className="hover:bg-slate-50">
                                                        <td className="p-3 text-slate-500 text-center">{det.item || i + 1}</td>
                                                        <td className="p-3 font-semibold text-slate-700">
                                                            <span className="block text-[10px] text-slate-400">{det.bien?.codigo_existencia || det.cod_admin}</span>
                                                            {det.bien?.descripcion || det.bienDesc || 'Producto Desconocido'}
                                                        </td>
                                                        <td className="p-3 text-slate-600">{det.presentacion?.descripcion || det.presentacionDesc || '-'}</td>
                                                        <td className="p-3 text-right font-mono text-slate-600">{cant.toFixed(2)}</td>
                                                        <td className="p-3 text-right font-mono font-bold text-emerald-600">{saldo.toFixed(2)}</td>
                                                        {!selectedDocData.isGuia && (
                                                            <>
                                                                <td className="p-3 text-right text-slate-600">{Number(det.costo || det.precio || 0).toFixed(4)}</td>
                                                                <td className="p-3 text-right font-semibold text-slate-700">{Number(det.importe || 0).toFixed(2)}</td>
                                                            </>
                                                        )}
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="flex justify-end pt-2 border-t">
                                <button 
                                    onClick={() => setDetailModalOpen(false)} 
                                    className="px-6 py-2.5 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 transition-colors shadow-md"
                                >
                                    Cerrar Detalles
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </Modal>
        </>
    );
}