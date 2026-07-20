"use client";

import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { toast } from 'sonner';
import { IconEdit, IconFilter, IconPlus, IconRefresh, IconSettings, IconTrash } from '@tabler/icons-react';
import DataTable from '@/components/shared/DataTable';
import FiltrosAvanzados from '@/components/filter/FiltrosAvanzados';
import Modal from '@/components/ui/Modal';
import SearchableSelect from '@/components/forms/SearchableSelect';
import { useCrud } from '@/hooks/useCrud';
import { senderWhatsAppService } from '@/services/senderWhatsAppService';
import { CLIENTE_WHATSAPP_ID, getApiErrorMessage } from '@/lib/whatsappConfig';
import { EstadoSenderWhatsApp, SenderWhatsApp } from '@/types';
import { ESTADO_SENDER_WHATSAPP_OPTIONS } from '@/utils/selectOptions';
import WhatsAppPageHeader from '../components/WhatsAppPageHeader';
import WhatsAppStatusBadge from '../components/WhatsAppStatusBadge';
import SenderWhatsAppFormModal from './components/SenderWhatsAppFormModal';

export default function NumerosWhatsAppPage() {
    const { data, loading, meta, filters, setFilters, fetchData } = useCrud<SenderWhatsApp>(senderWhatsAppService, CLIENTE_WHATSAPP_ID, { estado: [] as EstadoSenderWhatsApp[] });
    const [showForm, setShowForm] = useState(false);
    const [selected, setSelected] = useState<SenderWhatsApp | null>(null);
    const [statusSender, setStatusSender] = useState<SenderWhatsApp | null>(null);
    const [newStatus, setNewStatus] = useState<EstadoSenderWhatsApp>('pendiente');
    const [savingStatus, setSavingStatus] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [tempEstado, setTempEstado] = useState<EstadoSenderWhatsApp | ''>('');

    useEffect(() => { fetchData(1, '', filters); }, [fetchData, filters]);

    const openStatus = (sender: SenderWhatsApp) => {
        setStatusSender(sender);
        setNewStatus(sender.estado);
    };

    const saveStatus = async () => {
        if (!statusSender) return;
        setSavingStatus(true);
        try {
            const response = await senderWhatsAppService.changeEstado(statusSender.senderWhatsappId, newStatus);
            if (!response.isSuccess) return toast.error(response.message || 'No se pudo cambiar el estado.');
            toast.success('Estado actualizado correctamente.');
            setStatusSender(null);
            fetchData(meta.currentPage);
        } catch (error) {
            toast.error(getApiErrorMessage(error, 'No se pudo cambiar el estado del número.'));
        } finally {
            setSavingStatus(false);
        }
    };

    const remove = async (sender: SenderWhatsApp) => {
        const result = await Swal.fire({
            title: '¿Eliminar número?',
            text: sender.numero_telefono,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#dc2626'
        });
        if (!result.isConfirmed) return;
        try {
            const response = await senderWhatsAppService.delete(sender.senderWhatsappId);
            if (!response.isSuccess) return toast.error(response.message || 'No se pudo eliminar el número.');
            toast.success('Número eliminado correctamente.');
            fetchData(meta.currentPage);
        } catch (error) {
            toast.error(getApiErrorMessage(error, 'No se pudo eliminar el número.'));
        }
    };

    const columns = [
        { header: 'Número', render: (row: SenderWhatsApp) => <span className="font-mono text-sm font-bold text-slate-800">{row.numero_telefono}</span> },
        { header: 'Proveedor', render: (row: SenderWhatsApp) => <span className="rounded border border-sky-200 bg-sky-50 px-2 py-1 text-[10px] font-bold uppercase text-sky-700">{row.proveedor.replaceAll('_', ' ')}</span> },
        { header: 'Estado', width: '130px', render: (row: SenderWhatsApp) => <WhatsAppStatusBadge status={row.estado} /> },
        { header: 'Creación', width: '150px', render: (row: SenderWhatsApp) => <span className="text-xs text-slate-600">{row.fecha_creacion ? new Date(row.fecha_creacion).toLocaleString('es-PE') : '-'}</span> },
        {
            header: 'Acciones', width: '150px', className: 'text-center', render: (row: SenderWhatsApp) => (
                <div className="flex justify-center gap-1">
                    <button type="button" onClick={() => { setSelected(row); setShowForm(true); }} className="rounded p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600" title="Editar"><IconEdit size={18} /></button>
                    <button type="button" onClick={() => openStatus(row)} className="rounded p-1.5 text-slate-400 hover:bg-amber-50 hover:text-amber-600" title="Cambiar estado"><IconSettings size={18} /></button>
                    <button type="button" onClick={() => remove(row)} className="rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600" title="Eliminar"><IconTrash size={18} /></button>
                </div>
            )
        }
    ];

    return (
        <div className="p-6">
            <WhatsAppPageHeader title="Números de WhatsApp" description="Emisores configurados y estado de conexión" actions={
                <>
                    <button type="button" onClick={() => fetchData(meta.currentPage)} className="rounded-lg border border-slate-300 bg-white p-2.5 text-slate-500 hover:text-emerald-600"><IconRefresh size={19} className={loading ? 'animate-spin' : ''} /></button>
                    <button type="button" onClick={() => { setTempEstado(filters.estado?.[0] || ''); setShowFilters(true); }} className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-600"><IconFilter size={18} /> Filtros</button>
                    <button type="button" onClick={() => { setSelected(null); setShowForm(true); }} className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700"><IconPlus size={18} /> Nuevo número</button>
                </>
            } />
            <DataTable columns={columns} data={data} loading={loading} meta={meta} onPageChange={fetchData} />
            <FiltrosAvanzados isOpen={showFilters} onClose={() => setShowFilters(false)} onApply={() => setFilters({ estado: tempEstado ? [tempEstado] : [] })} onClear={() => { setTempEstado(''); setFilters({ estado: [] }); }} totalActive={tempEstado ? 1 : 0}>
                <SearchableSelect label="Estado del sender" value={tempEstado} options={[...ESTADO_SENDER_WHATSAPP_OPTIONS]} onChange={(event) => setTempEstado(event.target.value as EstadoSenderWhatsApp)} placeholder="Todos los estados" />
            </FiltrosAvanzados>
            <SenderWhatsAppFormModal isOpen={showForm} senderToEdit={selected} onClose={() => setShowForm(false)} onSuccess={() => fetchData(meta.currentPage)} />
            <Modal isOpen={!!statusSender} onClose={() => setStatusSender(null)} title="Cambiar estado del número" size="sm">
                <div className="space-y-5">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm font-semibold text-slate-700">{statusSender?.numero_telefono}</div>
                    <SearchableSelect label="Nuevo estado" value={newStatus} options={[...ESTADO_SENDER_WHATSAPP_OPTIONS]} onChange={(event) => setNewStatus(event.target.value as EstadoSenderWhatsApp)} />
                    <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                        <button type="button" onClick={() => setStatusSender(null)} className="px-4 py-2 text-xs font-bold text-slate-500">Cancelar</button>
                        <button type="button" onClick={saveStatus} disabled={savingStatus || newStatus === statusSender?.estado} className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-40">Actualizar estado</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
