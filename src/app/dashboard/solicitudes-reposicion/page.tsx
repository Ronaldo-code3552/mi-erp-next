"use client";

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import { toast } from 'sonner';
import {
    IconCirclePlus,
    IconEdit,
    IconEye,
    IconFilter,
    IconRefresh,
    IconX,
    IconBan,
    IconSearch,
    IconDotsVertical,
    IconCheck,
    IconLoader,
    IconPrinter
} from '@tabler/icons-react';

import DataTable from '@/components/shared/DataTable';
import FiltrosAvanzados from '@/components/filter/FiltrosAvanzados';
import MultiSelect from '@/components/forms/MultiSelect';
import Modal from '@/components/ui/Modal';
import { useCrud } from '@/hooks/useCrud';
import { useCatalogs } from '@/hooks/useCatalogs';
import { solicitudReposicionService } from '@/services/solicitudReposicionService';
import {
    SolicitudReposicionDetalle,
    SolicitudReposicionFilters,
    SolicitudReposicionResponse
} from '@/types/solicitudReposicion.types';
import { getAlmacenesActivosOrdenados } from '@/utils/almacenOptions';

const EMPRESA_ID = '005';
const USER_ID = 'CU0001';

const estadoSolicitudOptions = [
    { value: '1', label: 'PENDIENTE' },
    { value: '2', label: 'APROBADO' },
    { value: '3', label: 'RECHAZADO' },
    { value: '3', label: 'PARCIAL' },
    { value: '5', label: 'ATENDIDO' },
    { value: '6', label: 'ANULADO' },
    { value: '7', label: 'EN PROCESO' },
    { value: '8', label: 'CERRADO' }
];
const formatDate = (value?: string) => {
    if (!value) return '-';

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return '-';

    return date.toLocaleDateString('es-PE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
};

const formatNumber = (value?: number) => {
    return Number(value || 0).toLocaleString('es-PE', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
};

const openPdfFromBase64 = (base64Raw: string, fileName?: string) => {
    const base64 = base64Raw.includes('base64,')
        ? base64Raw.split('base64,').pop() || ''
        : base64Raw;

    if (!base64) {
        throw new Error('El documento no contiene base64 válido.');
    }

    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);

    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }

    const blob = new Blob([new Uint8Array(byteNumbers)], { type: 'application/pdf' });
    const fileUrl = URL.createObjectURL(blob);
    const opened = window.open(fileUrl, '_blank');

    if (!opened) {
        const link = document.createElement('a');
        link.href = fileUrl;
        link.download = fileName || 'SolicitudReposicion.pdf';
        link.click();
    }

    window.setTimeout(() => URL.revokeObjectURL(fileUrl), 30000);
};

const estadoBadgeClass = (estadoId?: number) => {
    if (estadoId === 7) return 'bg-blue-50 text-blue-700 border-blue-200';
    if (estadoId === 3) return 'bg-red-50 text-red-700 border-red-200';
    if (estadoId === 8) return 'bg-slate-100 text-slate-600 border-slate-200';
    if (estadoId === 6) return 'bg-emerald-50 text-emerald-700 border-emerald-200';

    return 'bg-slate-50 text-slate-600 border-slate-200';
};

const ESTADOS_DETALLE_PROCESADOS = new Set([2, 3, 4]);
const ESTADOS_DETALLE_PROCESADOS_NOMBRE = new Set(['APROBADO', 'RECHAZADO', 'PARCIAL']);

const normalizeEstadoText = (value?: string) => {
    return String(value || '').trim().toUpperCase();
};

const isDetalleProcesado = (detalle?: SolicitudReposicionDetalle) => {
    if (!detalle) return false;

    const estadoTexto = normalizeEstadoText(detalle.estado?.nombre || detalle.estado?.descripcion);

    return (
        (typeof detalle.estadoId === 'number' && ESTADOS_DETALLE_PROCESADOS.has(detalle.estadoId)) ||
        ESTADOS_DETALLE_PROCESADOS_NOMBRE.has(estadoTexto)
    );
};

const getDetalleEstadoId = (detalle?: { estadoId?: number | string }) => {
    const estadoId = Number(detalle?.estadoId);
    return Number.isNaN(estadoId) ? null : estadoId;
};

const hasDetalleEstado = (row: Pick<SolicitudReposicionResponse, 'detalles'>, estados: number[]) => {
    const allowedEstados = new Set(estados);

    return (row.detalles || []).some((detalle) => {
        const estadoId = getDetalleEstadoId(detalle);
        return estadoId !== null && allowedEstados.has(estadoId);
    });
};

const allDetallesEstado = (row: Pick<SolicitudReposicionResponse, 'detalles'>, estados: number[]) => {
    const detalles = row.detalles || [];
    const allowedEstados = new Set(estados);

    return detalles.length > 0 && detalles.every((detalle) => {
        const estadoId = getDetalleEstadoId(detalle);
        return estadoId !== null && allowedEstados.has(estadoId);
    });
};

const shouldUseDesaprobar = (row: SolicitudReposicionResponse) => {
    return (row.detalles || []).some(isDetalleProcesado) && !hasDetalleEstado(row, [5]);
};

type BasicOption = {
    value: string | number;
    label: string;
};

type ApprovalMode = 'approve' | 'disapprove';

type AprobarDetalleDraft = {
    item: number;
    productoLabel: string;
    presentacionLabel: string;
    cantidad_solicitada: number;
    cantidad_aprobada: string;
    observacion: string;
    estadoNombre: string;
    estadoDescripcion: string;
    estadoId?: number;
};

export default function SolicitudesReposicionPage() {
    const router = useRouter();

    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [openActionsId, setOpenActionsId] = useState<number | null>(null);
    const [approveModalOpen, setApproveModalOpen] = useState(false);
    const [approveLoading, setApproveLoading] = useState(false);
    const [approveSaving, setApproveSaving] = useState(false);
    const [approvalMode, setApprovalMode] = useState<ApprovalMode>('approve');
    const [approveSolicitud, setApproveSolicitud] = useState<SolicitudReposicionResponse | null>(null);
    const [approveItems, setApproveItems] = useState<AprobarDetalleDraft[]>([]);
    const [printingId, setPrintingId] = useState<number | null>(null);

    const initialFilters: SolicitudReposicionFilters = {
        FechaInicio: '',
        FechaFin: '',
        FiltroEstado: [],
        FiltroAlmacenOrigen: [],
        FiltroAlmacenDestino: [],
        FiltroCuentaUsuario: [],
        FiltroUsuarioAprobacion: [],
        FiltroBien: [],
        FiltroPresentacion: []
    };

    const {
        data,
        loading,
        meta,
        searchTerm,
        setSearchTerm,
        filters,
        setFilters,
        fetchData
    } = useCrud<SolicitudReposicionResponse>(
        solicitudReposicionService,
        null,
        initialFilters
    );

    const { catalogs, loadingCatalogs } = useCatalogs([
        { endpoint: 'Almacen', params: { empresaId: EMPRESA_ID } },
        { endpoint: 'Producto', params: { empresaId: EMPRESA_ID } },
        'CuentaUsuario'
    ]);

    const almacenOptions = useMemo(() => {
        return getAlmacenesActivosOrdenados(catalogs['Almacen'] || []).map((x: BasicOption) => ({
            value: x.value,
            label: x.label || ''
        }));
    }, [catalogs]);

    const productoOptions = useMemo(() => {
        return (catalogs['Producto'] || []).map((x: BasicOption) => ({
            value: x.value,
            label: x.label || ''
        }));
    }, [catalogs]);

    const usuarioOptions = useMemo(() => {
        return (catalogs['CuentaUsuario'] || []).map((x: BasicOption) => ({
            value: x.value,
            label: x.label || ''
        }));
    }, [catalogs]);

    const totalFiltrosActivos = useMemo(() => {
        const f = filters as SolicitudReposicionFilters;

        let total = 0;

        if (f.FechaInicio) total++;
        if (f.FechaFin) total++;
        if (f.FiltroEstado?.length) total += f.FiltroEstado.length;
        if (f.FiltroAlmacenOrigen?.length) total += f.FiltroAlmacenOrigen.length;
        if (f.FiltroAlmacenDestino?.length) total += f.FiltroAlmacenDestino.length;
        if (f.FiltroCuentaUsuario?.length) total += f.FiltroCuentaUsuario.length;
        if (f.FiltroUsuarioAprobacion?.length) total += f.FiltroUsuarioAprobacion.length;
        if (f.FiltroBien?.length) total += f.FiltroBien.length;
        if (f.FiltroPresentacion?.length) total += f.FiltroPresentacion.length;

        return total;
    }, [filters]);

    useEffect(() => {
        fetchData(1);
    }, [fetchData]);

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        fetchData(1, searchTerm, filters);
    };

    const handleClearFilters = () => {
        setFilters(initialFilters);
        fetchData(1, searchTerm, initialFilters);
    };

    const closeApproveModal = () => {
        if (approveSaving) return;

        setApproveModalOpen(false);
        setApproveSolicitud(null);
        setApproveItems([]);
        setApprovalMode('approve');
    };

    const openAprobarModal = async (row: SolicitudReposicionResponse, mode: ApprovalMode = 'approve') => {
        if (mode === 'approve' && (row.estadoId !== 7 || !allDetallesEstado(row, [1]))) {
            toast.warning('Solo se pueden aprobar solicitudes pendientes.');
            return;
        }

        setApproveModalOpen(true);
        setApproveLoading(true);
        setApprovalMode(mode);
        setApproveSolicitud(null);
        setApproveItems([]);

        const response = await solicitudReposicionService.getById(row.id);

        if (!response.isSuccess || !response.data?.id) {
            toast.error(response.message || 'No se pudo cargar la solicitud para aprobación.');
            setApproveModalOpen(false);
            setApproveLoading(false);
            return;
        }

        const detalles = response.data.detalles || [];
        const hasProcessedDetails = detalles.some(isDetalleProcesado);
        const hasAttendedDetails = hasDetalleEstado(response.data, [5]);

        if (mode === 'approve' && (response.data.estadoId !== 7 || !allDetallesEstado(response.data, [1]))) {
            toast.warning('La solicitud ya no está pendiente de aprobación.');
            setApproveModalOpen(false);
            setApproveLoading(false);
            fetchData(meta.currentPage || 1);
            return;
        }

        if (mode === 'disapprove' && hasAttendedDetails) {
            toast.warning('No se puede desaprobar una solicitud con detalles atendidos.');
            setApproveModalOpen(false);
            setApproveLoading(false);
            fetchData(meta.currentPage || 1);
            return;
        }

        if (mode === 'disapprove' && !hasProcessedDetails) {
            toast.warning('La solicitud no tiene productos aprobados, rechazados o parciales para desaprobar.');
            setApproveModalOpen(false);
            setApproveLoading(false);
            fetchData(meta.currentPage || 1);
            return;
        }

        if (!detalles.length) {
            toast.error(`No se pudo ${mode === 'disapprove' ? 'desaprobar' : 'aprobar'}: la solicitud no tiene detalle de productos.`);
            setApproveModalOpen(false);
            setApproveLoading(false);
            return;
        }

        setApproveSolicitud(response.data);
        setApproveItems(detalles.map((item, index) => {
            const cantidadSolicitada = Number(item.cantidad_solicitada || 0);

            return {
                item: Number(item.item || index + 1),
                productoLabel: item.bien?.descripcion || item.bienId || '-',
                presentacionLabel: item.presentacion?.descripcion || item.presentacionId || '-',
                cantidad_solicitada: cantidadSolicitada,
                cantidad_aprobada: String(Number(item.cantidad_aprobada ?? cantidadSolicitada)),
                observacion: item.observacion || '',
                estadoNombre: item.estado?.nombre || (item.estadoId ? `Estado ${item.estadoId}` : '-'),
                estadoDescripcion: item.estado?.descripcion || '',
                estadoId: item.estadoId
            };
        }));
        setApproveLoading(false);
    };

    const handleApproveItemChange = (
        index: number,
        field: 'cantidad_aprobada' | 'observacion',
        value: string
    ) => {
        setApproveItems(prev => prev.map((item, itemIndex) => (
            itemIndex === index
                ? { ...item, [field]: value }
                : item
        )));
    };

    const handleSubmitAprobacion = async () => {
        if (!approveSolicitud) return;

        if (approvalMode === 'approve' && (approveSolicitud.estadoId !== 7 || !allDetallesEstado(approveSolicitud, [1]))) {
            toast.warning('Solo se pueden aprobar solicitudes pendientes.');
            return;
        }

        if (approvalMode === 'disapprove' && !approveItems.some(item => (
            (typeof item.estadoId === 'number' && ESTADOS_DETALLE_PROCESADOS.has(item.estadoId)) ||
            ESTADOS_DETALLE_PROCESADOS_NOMBRE.has(normalizeEstadoText(item.estadoNombre))
        ))) {
            toast.warning('La solicitud no tiene productos aprobados, rechazados o parciales para desaprobar.');
            return;
        }

        if (approvalMode === 'disapprove' && approveItems.some(item => getDetalleEstadoId(item) === 5)) {
            toast.warning('No se puede desaprobar una solicitud con detalles atendidos.');
            return;
        }

        if (!approveItems.length) {
            toast.error(`La solicitud no tiene productos para ${approvalMode === 'disapprove' ? 'desaprobar' : 'aprobar'}.`);
            return;
        }

        if (approvalMode === 'approve') {
            const invalidItem = approveItems.find(item => {
                const cantidadAprobada = Number(item.cantidad_aprobada);

                return (
                    Number.isNaN(cantidadAprobada) ||
                    cantidadAprobada < 0 ||
                    cantidadAprobada > item.cantidad_solicitada
                );
            });

            if (invalidItem) {
                toast.error(`Revise el ítem ${invalidItem.item}: la cantidad aprobada debe estar entre 0 y ${formatNumber(invalidItem.cantidad_solicitada)}.`);
                return;
            }
        }

        setApproveSaving(true);

        const response = await solicitudReposicionService.aprobar(approveSolicitud.id, {
            usuario_aprobacionId: USER_ID,
            estadoAprobacion: approvalMode === 'approve',
            detalle: approveItems.map(item => ({
                item: item.item,
                cantidad_aprobada: Number(item.cantidad_aprobada || 0),
                observacion: item.observacion.trim() || undefined
            }))
        });

        if (response.isSuccess) {
            toast.success(`Solicitud ${approvalMode === 'disapprove' ? 'desaprobada' : 'aprobada'} correctamente.`);
            setApproveSaving(false);
            closeApproveModal();
            fetchData(meta.currentPage || 1);
        } else {
            toast.error(response.message || `No se pudo ${approvalMode === 'disapprove' ? 'desaprobar' : 'aprobar'} la solicitud.`);
            setApproveSaving(false);
        }
    };

    const handleAnular = async (row: SolicitudReposicionResponse) => {
        const result = await Swal.fire({
            title: '¿Anular solicitud?',
            input: 'textarea',
            inputLabel: 'Motivo de anulación',
            inputPlaceholder: 'Ingrese el motivo de anulación...',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Anular',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#f59e0b',
            inputValidator: (value) => {
                if (!value || value.trim() === '') {
                    return 'Debe ingresar un motivo de anulación.';
                }
                return null;
            }
        });

        if (!result.isConfirmed) return;

        const response = await solicitudReposicionService.anular(row.id, {
            usuario_anulacionId: USER_ID,
            motivo_anulacion: result.value
        });

        if (response.isSuccess) {
            toast.success('Solicitud anulada correctamente.');
            fetchData(meta.currentPage || 1);
        } else {
            toast.error(response.message || 'No se pudo anular la solicitud.');
        }
    };

    const handleRechazar = async (row: SolicitudReposicionResponse) => {
        const result = await Swal.fire({
            title: '¿Rechazar solicitud?',
            input: 'textarea',
            inputLabel: 'Motivo de rechazo',
            inputPlaceholder: 'Ingrese el motivo de rechazo...',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Rechazar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#ef4444',
            inputValidator: (value) => {
                if (!value || value.trim() === '') {
                    return 'Debe ingresar un motivo de rechazo.';
                }
                return null;
            }
        });

        if (!result.isConfirmed) return;

        const response = await solicitudReposicionService.rechazar(row.id, {
            usuario_aprobacionId: USER_ID,
            motivo_rechazo: result.value
        });

        if (response.isSuccess) {
            toast.success('Solicitud rechazada correctamente.');
            fetchData(meta.currentPage || 1);
        } else {
            toast.error(response.message || 'No se pudo rechazar la solicitud.');
        }
    };

    const handleImprimir = async (row: SolicitudReposicionResponse) => {
        if (printingId === row.id) return;

        setPrintingId(row.id);

        try {
            const response = await solicitudReposicionService.imprimir(row.id);
            const base64 = String(response.data?.base64 || '').trim();

            if (!response.isSuccess || !base64) {
                toast.error(response.message || 'No se pudo generar el PDF de la solicitud.');
                return;
            }

            openPdfFromBase64(base64, response.data?.fileName || `SOLICITUD-REPOSICION-${row.id}.pdf`);
            toast.success(response.message || 'Documento generado correctamente.');
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Error al imprimir la solicitud.';
            toast.error(message);
        } finally {
            setPrintingId(null);
        }
    };

    const closeActionsMenu = () => setOpenActionsId(null);

    const columns = [
        {
            header: 'Solicitud',
            render: (row: SolicitudReposicionResponse) => (
                <div className="flex flex-col">
                    <span className="font-bold text-slate-800">#{row.id}</span>
                    <span className="text-[11px] text-slate-400">Nro. solicitud</span>
                </div>
            )
        },
        {
            header: 'Fechas',
            render: (row: SolicitudReposicionResponse) => (
                <div className="flex flex-col gap-1">
                    <div>
                        <span className="text-[10px] font-bold uppercase text-slate-400">Emisión</span>
                        <p className="font-semibold text-slate-700">{formatDate(row.fecha_emision)}</p>
                    </div>
                    <div>
                        <span className="text-[10px] font-bold uppercase text-slate-400">Plazo</span>
                        <p className="font-semibold text-blue-700">{formatDate(row.fecha_plazo_solicitud)}</p>
                    </div>
                </div>
            )
        },
        {
            header: 'Origen',
            render: (row: SolicitudReposicionResponse) => (
                <div className="flex flex-col">
                    <span className="font-semibold text-slate-700 uppercase">
                        {row.almacenOrigen?.descripcion || row.almacen_origenId || '-'}
                    </span>
                </div>
            )
        },
        {
            header: 'Destino',
            render: (row: SolicitudReposicionResponse) => (
                <div className="flex flex-col">
                    <span className="font-semibold text-slate-700 uppercase">
                        {row.almacenDestino?.descripcion || row.almacen_destinoId || '-'}
                    </span>
                </div>
            )
        },
        {
            header: 'Estado',
            render: (row: SolicitudReposicionResponse) => (
                <span className={`inline-flex px-2 py-1 rounded-full border text-[11px] font-bold uppercase ${estadoBadgeClass(row.estadoId)}`}>
                    {row.estado?.nombre || row.estado?.descripcion || row.estadoId}
                </span>
            )
        },
        {
            header: 'Usuario',
            render: (row: SolicitudReposicionResponse) => (
                <div className="flex flex-col">
                    <span className="font-semibold text-slate-700">{row.cuentaUsuario?.observacion || row.cuentausuarioId}</span>
                    <span className="text-[11px] text-slate-400">{row.cuentaUsuario?.usuario || '-'}</span>
                </div>
            )
        },
        {
            header: 'Productos',
            render: (row: SolicitudReposicionResponse) => (
                <span className="font-bold text-slate-700">
                    {row.total_items || 0}
                </span>
            ),
            className: 'text-center'
        },
        {
            header: 'Acciones',
            render: (row: SolicitudReposicionResponse) => {
                const allDetailsPending = allDetallesEstado(row, [1]);
                const canEdit = allDetailsPending;
                const canApprove = row.estadoId === 7 && allDetailsPending;
                const canDisapprove = shouldUseDesaprobar(row);
                const canReject = allDetailsPending;
                const canAnnul = allDetallesEstado(row, [1, 3]);
                const canOpenApproveAction = canApprove || canDisapprove;
                const canOpenActions = canOpenApproveAction || canReject || canAnnul;
                const actionMode: ApprovalMode = canDisapprove ? 'disapprove' : 'approve';

                return (
                    <div className="relative flex items-center justify-end gap-1">
                        <button
                            onClick={() => router.push(`/dashboard/solicitudes-reposicion/editar/${row.id}?mode=view`)}
                            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                            title="Ver"
                        >
                            <IconEye size={17} />
                        </button>

                        {canEdit && (
                            <button
                                onClick={() => router.push(`/dashboard/solicitudes-reposicion/editar/${row.id}`)}
                                className="p-2 rounded-lg text-blue-600 hover:bg-blue-50"
                                title="Editar"
                            >
                                <IconEdit size={17} />
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={() => handleImprimir(row)}
                            disabled={printingId === row.id}
                            className="p-2 rounded-lg text-slate-500 hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-60"
                            title="Imprimir"
                        >
                            {printingId === row.id ? (
                                <IconLoader size={17} className="animate-spin" />
                            ) : (
                                <IconPrinter size={17} />
                            )}
                        </button>

                        {canOpenActions && (
                            <button
                                type="button"
                                onClick={() => setOpenActionsId(openActionsId === row.id ? null : row.id)}
                                className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                                title="Más acciones"
                            >
                                <IconDotsVertical size={17} />
                            </button>
                        )}

                        {canOpenActions && openActionsId === row.id && (
                            <div className="absolute right-0 top-9 z-30 w-40 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 text-left shadow-xl">
                                {canOpenApproveAction && (
                                    <button
                                        type="button"
                                        onClick={() => { closeActionsMenu(); openAprobarModal(row, actionMode); }}
                                        className={`flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold ${
                                            actionMode === 'disapprove'
                                                ? 'text-orange-700 hover:bg-orange-50'
                                                : 'text-emerald-700 hover:bg-emerald-50'
                                        }`}
                                    >
                                        {actionMode === 'disapprove' ? <IconBan size={15} /> : <IconCheck size={15} />}
                                        {actionMode === 'disapprove' ? 'Desaprobar' : 'Aprobar'}
                                    </button>
                                )}

                                {canReject && (
                                    <button
                                        type="button"
                                        onClick={() => { closeActionsMenu(); handleRechazar(row); }}
                                        className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                                    >
                                        <IconX size={15} /> Rechazar
                                    </button>
                                )}

                                {canAnnul && (
                                    <button
                                        type="button"
                                        onClick={() => { closeActionsMenu(); handleAnular(row); }}
                                        className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-orange-600 hover:bg-orange-50"
                                    >
                                        <IconBan size={15} /> Anular
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                );
            },
            className: 'text-right'
        }
    ];

    return (
        <div className="p-6 flex flex-col gap-5">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-black text-slate-800">
                        Solicitudes de Reposición
                    </h1>
                    <p className="text-sm text-slate-500">
                        Gestión de cabecera, detalle, aprobación, rechazo y anulación.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => fetchData(meta.currentPage || 1)}
                        className="px-3 py-2 border border-slate-200 rounded-lg text-sm font-semibold text-slate-600 hover:bg-slate-50 flex items-center gap-2"
                    >
                        <IconRefresh size={18} />
                    </button>

                    <button
                        onClick={() => router.push('/dashboard/solicitudes-reposicion/crear')}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm"
                    >
                        <IconCirclePlus size={18} />
                        Nueva solicitud
                    </button>
                </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col md:flex-row gap-3 md:items-center md:justify-between shadow-sm">
                <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-xl">
                    <IconSearch size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Buscar por solicitud, almacén, estado, usuario o producto..."
                        className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-lg text-sm outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400"
                    />
                </form>

                <button
                    onClick={() => setIsFilterOpen(true)}
                    className="px-4 py-2.5 border border-slate-200 rounded-lg text-sm font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-2"
                >
                    <IconFilter size={18} />
                    Filtros
                    {totalFiltrosActivos > 0 && (
                        <span className="bg-blue-600 text-white rounded-full px-2 py-0.5 text-[11px]">
                            {totalFiltrosActivos}
                        </span>
                    )}
                </button>
            </div>

            <DataTable
                columns={columns}
                data={data}
                loading={loading || loadingCatalogs}
                meta={meta}
                onPageChange={(page) => fetchData(page)}
                emptyMessage="No se encontraron solicitudes de reposición"
            />

            <Modal
                isOpen={approveModalOpen}
                onClose={closeApproveModal}
                title={
                    approveSolicitud
                        ? `${approvalMode === 'disapprove' ? 'Desaprobar' : 'Aprobar'} solicitud #${approveSolicitud.id}`
                        : `${approvalMode === 'disapprove' ? 'Desaprobar' : 'Aprobar'} solicitud`
                }
                size="xl"
            >
                {approveLoading ? (
                    <div className="flex flex-col items-center justify-center py-16 text-blue-600">
                        <IconLoader size={34} className="animate-spin" />
                        <p className="mt-3 text-sm font-semibold text-slate-600">Cargando detalle de la solicitud...</p>
                    </div>
                ) : approveSolicitud ? (
                    <div className="space-y-5">
                        <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                                <div className="flex flex-wrap items-center gap-2">
                                    <span className={`inline-flex px-2.5 py-1 rounded-full border text-[11px] font-bold uppercase ${estadoBadgeClass(approveSolicitud.estadoId)}`}>
                                        {approveSolicitud.estado?.nombre || approveSolicitud.estado?.descripcion || approveSolicitud.estadoId}
                                    </span>
                                    <span className="text-xs font-semibold text-slate-500">
                                        Emisión: <span className="text-slate-700">{formatDate(approveSolicitud.fecha_emision)}</span>
                                    </span>
                                    <span className="hidden h-4 w-px bg-slate-200 sm:inline-block" />
                                    <span className="text-xs font-semibold text-slate-500">
                                        Plazo: <span className="text-blue-700">{formatDate(approveSolicitud.fecha_plazo_solicitud)}</span>
                                    </span>
                                    {approveSolicitud.fecha_aprobacion && (
                                        <>
                                            <span className="hidden h-4 w-px bg-slate-200 sm:inline-block" />
                                            <span className="text-xs font-semibold text-slate-500">
                                                Aprobación: <span className="text-emerald-700">{formatDate(approveSolicitud.fecha_aprobacion)}</span>
                                            </span>
                                        </>
                                    )}
                                </div>

                                <div className="flex flex-col gap-2 text-xs sm:flex-row sm:items-center sm:gap-4 lg:text-right">
                                    <div>
                                        <span className="font-bold uppercase text-slate-400">Solicitante</span>
                                        <p className="font-bold text-slate-700">{approveSolicitud.cuentaUsuario?.observacion || approveSolicitud.cuentausuarioId}</p>
                                        <p className="text-[11px] text-slate-400">{approveSolicitud.cuentaUsuario?.usuario || approveSolicitud.cuentausuarioId}</p>
                                    </div>
                                    {approveSolicitud.fecha_aprobacion && (
                                        <div className="border-t border-slate-200 pt-2 sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
                                            <span className="font-bold uppercase text-slate-400">Aprobador</span>
                                            <p className="font-bold text-slate-700">{approveSolicitud.usuarioAprobacion?.observacion || approveSolicitud.usuario_aprobacionId || '-'}</p>
                                            <p className="text-[11px] text-slate-400">{approveSolicitud.usuarioAprobacion?.usuario || approveSolicitud.usuario_aprobacionId || '-'}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="rounded-lg border border-slate-200 p-3">
                                <p className="text-[10px] font-bold uppercase text-slate-400">Almacén origen</p>
                                <p className="mt-1 text-sm font-semibold text-slate-700 uppercase">
                                    {approveSolicitud.almacenOrigen?.descripcion || approveSolicitud.almacen_origenId || '-'}
                                </p>
                            </div>
                            <div className="rounded-lg border border-slate-200 p-3">
                                <p className="text-[10px] font-bold uppercase text-slate-400">Almacén destino</p>
                                <p className="mt-1 text-sm font-semibold text-slate-700 uppercase">
                                    {approveSolicitud.almacenDestino?.descripcion || approveSolicitud.almacen_destinoId || '-'}
                                </p>
                            </div>
                        </div>

                        <div className={`rounded-lg border px-3 py-2 text-xs font-semibold ${
                            approvalMode === 'disapprove'
                                ? 'border-orange-100 bg-orange-50 text-orange-700'
                                : 'border-blue-100 bg-blue-50 text-blue-700'
                        }`}>
                            {approvalMode === 'disapprove'
                                ? 'Esta acción desaprobará la solicitud y reiniciará el procesamiento.'
                                : 'Ingrese una cantidad aprobada para cada producto no puede superar la cantidad solicitada.'}
                        </div>

                        <div className="overflow-x-auto rounded-lg border border-slate-200">
                            <table className="w-full min-w-[960px] text-left text-xs">
                                <thead className="bg-slate-50 text-slate-500 uppercase">
                                    <tr>
                                        <th className="p-3 w-12">#</th>
                                        <th className="p-3">Producto</th>
                                        <th className="p-3 w-48">Presentación</th>
                                        <th className="p-3 w-32">Estado</th>
                                        <th className="p-3 w-32 text-right">Solicitado</th>
                                        <th className="p-3 w-40 text-right">Aprobado</th>
                                        <th className="p-3 w-64">Observación</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {approveItems.map((item, index) => {
                                        const cantidadAprobada = Number(item.cantidad_aprobada);
                                        const isInvalid = (
                                            Number.isNaN(cantidadAprobada) ||
                                            cantidadAprobada < 0 ||
                                            cantidadAprobada > item.cantidad_solicitada
                                        );

                                        return (
                                            <tr key={`${item.item}-${index}`} className="hover:bg-slate-50 align-top">
                                                <td className="p-3 font-mono font-bold text-slate-400">{item.item}</td>
                                                <td className="p-3">
                                                    <p className="font-bold text-slate-700">{item.productoLabel}</p>
                                                </td>
                                                <td className="p-3 text-slate-600">{item.presentacionLabel}</td>
                                                <td className="p-3">
                                                    <span
                                                        title={item.estadoDescripcion || item.estadoNombre}
                                                        className={`inline-flex px-2 py-1 rounded-full border text-[10px] font-bold uppercase ${estadoBadgeClass(item.estadoId)}`}
                                                    >
                                                        {item.estadoNombre}
                                                    </span>
                                                </td>
                                                <td className="p-3 text-right font-mono font-bold text-slate-700">
                                                    {formatNumber(item.cantidad_solicitada)}
                                                </td>
                                                <td className="p-3">
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        max={item.cantidad_solicitada}
                                                        step="0.01"
                                                        value={item.cantidad_aprobada}
                                                        disabled={approvalMode === 'disapprove'}
                                                        onChange={(e) => handleApproveItemChange(index, 'cantidad_aprobada', e.target.value)}
                                                        className={`w-full rounded-lg border px-2 py-2 text-right font-mono outline-none focus:ring-2 ${
                                                            approvalMode === 'disapprove'
                                                                ? 'border-slate-200 bg-slate-100 text-slate-500 cursor-not-allowed'
                                                                : isInvalid
                                                                ? 'border-red-300 bg-red-50 text-red-700 focus:ring-red-100'
                                                                : 'border-slate-200 focus:border-emerald-400 focus:ring-emerald-100'
                                                        }`}
                                                    />
                                                </td>
                                                <td className="p-3">
                                                    <input
                                                        value={item.observacion}
                                                        onChange={(e) => handleApproveItemChange(index, 'observacion', e.target.value)}
                                                        placeholder="Observación opcional"
                                                        className="w-full rounded-lg border border-slate-200 px-2 py-2 outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
                                                    />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 border-t border-slate-100 pt-4">
                            <button
                                type="button"
                                onClick={closeApproveModal}
                                disabled={approveSaving}
                                className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleSubmitAprobacion}
                                disabled={approveSaving}
                                className={`px-4 py-2 rounded-lg text-sm font-bold text-white disabled:opacity-70 flex items-center justify-center gap-2 ${
                                    approvalMode === 'disapprove'
                                        ? 'bg-orange-600 hover:bg-orange-700'
                                        : 'bg-emerald-600 hover:bg-emerald-700'
                                }`}
                            >
Procesar solicitud
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="py-10 text-center text-sm text-slate-500">
                        No se pudo cargar la solicitud.
                    </div>
                )}
            </Modal>

            <FiltrosAvanzados
                isOpen={isFilterOpen}
                onClose={() => setIsFilterOpen(false)}
                onApply={() => fetchData(1, searchTerm, filters)}
                onClear={handleClearFilters}
                totalActive={totalFiltrosActivos}
            >
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">Fecha inicio</label>
                        <input
                            type="date"
                            value={(filters as SolicitudReposicionFilters).FechaInicio || ''}
                            onChange={(e) => setFilters((prev: SolicitudReposicionFilters) => ({
                                ...prev,
                                FechaInicio: e.target.value
                            }))}
                            className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-400"
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase ml-1">Fecha fin</label>
                        <input
                            type="date"
                            value={(filters as SolicitudReposicionFilters).FechaFin || ''}
                            onChange={(e) => setFilters((prev: SolicitudReposicionFilters) => ({
                                ...prev,
                                FechaFin: e.target.value
                            }))}
                            className="w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-blue-400"
                        />
                    </div>

                    <MultiSelect
                        label="Estado"
                        options={estadoSolicitudOptions}
                        value={(filters as SolicitudReposicionFilters).FiltroEstado || []}
                        onChange={(value) => setFilters((prev: SolicitudReposicionFilters) => ({
                            ...prev,
                            FiltroEstado: value.map(String)
                        }))}
                    />

                    <MultiSelect
                        label="Almacén origen"
                        options={almacenOptions}
                        value={(filters as SolicitudReposicionFilters).FiltroAlmacenOrigen || []}
                        onChange={(value) => setFilters((prev: SolicitudReposicionFilters) => ({
                            ...prev,
                            FiltroAlmacenOrigen: value.map(String)
                        }))}
                    />

                    <MultiSelect
                        label="Almacén destino"
                        options={almacenOptions}
                        value={(filters as SolicitudReposicionFilters).FiltroAlmacenDestino || []}
                        onChange={(value) => setFilters((prev: SolicitudReposicionFilters) => ({
                            ...prev,
                            FiltroAlmacenDestino: value.map(String)
                        }))}
                    />

                    <MultiSelect
                        label="Usuario solicitante"
                        options={usuarioOptions}
                        value={(filters as SolicitudReposicionFilters).FiltroCuentaUsuario || []}
                        onChange={(value) => setFilters((prev: SolicitudReposicionFilters) => ({
                            ...prev,
                            FiltroCuentaUsuario: value.map(String)
                        }))}
                    />

                    <MultiSelect
                        label="Producto"
                        options={productoOptions}
                        value={(filters as SolicitudReposicionFilters).FiltroBien || []}
                        onChange={(value) => setFilters((prev: SolicitudReposicionFilters) => ({
                            ...prev,
                            FiltroBien: value.map(String)
                        }))}
                    />
                </div>
            </FiltrosAvanzados>
        </div>
    );
}
