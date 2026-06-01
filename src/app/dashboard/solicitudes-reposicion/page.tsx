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
    IconTrash,
    IconX,
    IconBan,
    IconSearch,
    IconDotsVertical,
    IconCheck
} from '@tabler/icons-react';

import DataTable from '@/components/shared/DataTable';
import FiltrosAvanzados from '@/components/filter/FiltrosAvanzados';
import MultiSelect from '@/components/forms/MultiSelect';
import { useCrud } from '@/hooks/useCrud';
import { useCatalogs } from '@/hooks/useCatalogs';
import { solicitudReposicionService } from '@/services/solicitudReposicionService';
import { SolicitudReposicionFilters, SolicitudReposicionResponse } from '@/types/solicitudReposicion.types';
import { getAlmacenesActivosOrdenados } from '@/utils/almacenOptions';

const EMPRESA_ID = '005';
const USER_ID = 'CU0001';

const estadoSolicitudOptions = [
    { value: '7', label: 'EN PROCESO' },
    { value: '3', label: 'RECHAZADO' },
    { value: '6', label: 'ANULADO' },
    { value: '5', label: 'ATENDIDO' },
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

const estadoBadgeClass = (estadoId?: number) => {
    if (estadoId === 7) return 'bg-blue-50 text-blue-700 border-blue-200';
    if (estadoId === 3) return 'bg-red-50 text-red-700 border-red-200';
    if (estadoId === 8) return 'bg-slate-100 text-slate-600 border-slate-200';
    if (estadoId === 6) return 'bg-emerald-50 text-emerald-700 border-emerald-200';

    return 'bg-slate-50 text-slate-600 border-slate-200';
};

type BasicOption = {
    value: string | number;
    label?: string;
};

export default function SolicitudesReposicionPage() {
    const router = useRouter();

    const [isFilterOpen, setIsFilterOpen] = useState(false);
    const [openActionsId, setOpenActionsId] = useState<number | null>(null);

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
            label: x.label
        }));
    }, [catalogs]);

    const productoOptions = useMemo(() => {
        return (catalogs['Producto'] || []).map((x: BasicOption) => ({
            value: x.value,
            label: x.label
        }));
    }, [catalogs]);

    const usuarioOptions = useMemo(() => {
        return (catalogs['CuentaUsuario'] || []).map((x: BasicOption) => ({
            value: x.value,
            label: x.label
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

    const handleAprobar = async (row: SolicitudReposicionResponse) => {
        const result = await Swal.fire({
            title: '¿Aprobar solicitud?',
            text: `Se aprobarán las cantidades solicitadas de la solicitud #${row.id}.`,
            icon: 'question',
            showCancelButton: true,
            confirmButtonText: 'Aprobar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#16a34a'
        });

        if (!result.isConfirmed) return;

        const detalleSource = row.detalles?.length
            ? row
            : (await solicitudReposicionService.getById(row.id)).data;

        const detalles = detalleSource.detalles || [];

        if (!detalles.length) {
            toast.error('No se pudo aprobar: la solicitud no tiene detalle de productos.');
            return;
        }

        const response = await solicitudReposicionService.aprobar(row.id, {
            usuario_aprobacionId: USER_ID,
            detalle: detalles.map((item, index) => ({
                item: Number(item.item || index + 1),
                cantidad_aprobada: Number(item.cantidad_aprobada || item.cantidad_solicitada || 0),
                observacion: item.observacion
            }))
        });

        if (response.isSuccess) {
            toast.success('Solicitud aprobada correctamente.');
            fetchData(meta.currentPage || 1);
        } else {
            toast.error(response.message || 'No se pudo aprobar la solicitud.');
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

    const handleDelete = async (row: SolicitudReposicionResponse) => {
        const result = await Swal.fire({
            title: '¿Eliminar solicitud?',
            text: 'Solo debe eliminarse si todavía no fue procesada.',
            icon: 'error',
            showCancelButton: true,
            confirmButtonText: 'Eliminar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#ef4444'
        });

        if (!result.isConfirmed) return;

        const response = await solicitudReposicionService.delete(row.id);

        if (response.isSuccess) {
            toast.success('Solicitud eliminada correctamente.');
            fetchData(meta.currentPage || 1);
        } else {
            toast.error(response.message || 'No se pudo eliminar la solicitud.');
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
            header: 'Solicitado',
            render: (row: SolicitudReposicionResponse) => formatNumber(row.total_solicitado),
            className: 'text-right'
        },
        {
            header: 'Aprobado',
            render: (row: SolicitudReposicionResponse) => formatNumber(row.total_aprobado),
            className: 'text-right'
        },
        {
            header: 'Atendido',
            render: (row: SolicitudReposicionResponse) => formatNumber(row.total_atendido),
            className: 'text-right'
        },
        {
            header: 'Pendiente',
            render: (row: SolicitudReposicionResponse) => (
                <span className={row.indicador_pendiente ? 'text-orange-600 font-bold' : 'text-slate-500'}>
                    {formatNumber(row.total_pendiente)}
                </span>
            ),
            className: 'text-right'
        },
        {
            header: 'Acciones',
            render: (row: SolicitudReposicionResponse) => (
                <div className="relative flex items-center justify-end gap-1">
                    <button
                        onClick={() => router.push(`/dashboard/solicitudes-reposicion/editar/${row.id}?mode=view`)}
                        className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                        title="Ver"
                    >
                        <IconEye size={17} />
                    </button>

                    {row.estadoId === 7 && (
                        <button
                            onClick={() => router.push(`/dashboard/solicitudes-reposicion/editar/${row.id}`)}
                            className="p-2 rounded-lg text-blue-600 hover:bg-blue-50"
                            title="Editar"
                        >
                            <IconEdit size={17} />
                        </button>
                    )}

                    {row.estadoId === 7 && (
                        <button
                            type="button"
                            onClick={() => setOpenActionsId(openActionsId === row.id ? null : row.id)}
                            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                            title="Más acciones"
                        >
                            <IconDotsVertical size={17} />
                        </button>
                    )}

                    {row.estadoId === 7 && openActionsId === row.id && (
                        <div className="absolute right-0 top-9 z-30 w-40 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 text-left shadow-xl">
                            <button
                                type="button"
                                onClick={() => { closeActionsMenu(); handleAprobar(row); }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                            >
                                <IconCheck size={15} /> Aprobar
                            </button>

                            <button
                                type="button"
                                onClick={() => { closeActionsMenu(); handleRechazar(row); }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                            >
                                <IconX size={15} /> Rechazar
                            </button>

                            <button
                                type="button"
                                onClick={() => { closeActionsMenu(); handleAnular(row); }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-orange-600 hover:bg-orange-50"
                            >
                                <IconBan size={15} /> Anular
                            </button>

                            <button
                                type="button"
                                onClick={() => { closeActionsMenu(); handleDelete(row); }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"
                            >
                                <IconTrash size={15} /> Eliminar
                            </button>
                        </div>
                    )}
                </div>
            ),
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
