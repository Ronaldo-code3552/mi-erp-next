"use client";

import { useCallback, useEffect, useState } from 'react';
import { IconEye, IconFilter, IconLoader2, IconRefresh } from '@tabler/icons-react';
import { toast } from 'sonner';
import DataTable from '@/components/shared/DataTable';
import FiltrosAvanzados from '@/components/filter/FiltrosAvanzados';
import SearchableSelect from '@/components/forms/SearchableSelect';
import Modal from '@/components/ui/Modal';
import { mensajeWhatsAppService } from '@/services/mensajeWhatsAppService';
import { senderWhatsAppService } from '@/services/senderWhatsAppService';
import { CLIENTE_WHATSAPP_ID, getApiErrorMessage } from '@/lib/whatsappConfig';
import { DireccionMensajeWhatsApp, EstadoMensajeWhatsApp, EventoEstadoMensajeWhatsApp, MensajeWhatsApp, MensajeWhatsAppLogFilters, SenderWhatsApp } from '@/types';
import { DIRECCION_MENSAJE_WHATSAPP_OPTIONS, ESTADO_MENSAJE_WHATSAPP_OPTIONS } from '@/utils/selectOptions';
import WhatsAppPageHeader from '../components/WhatsAppPageHeader';
import WhatsAppStatusBadge from '../components/WhatsAppStatusBadge';

const emptyFilters: MensajeWhatsAppLogFilters = {};

export default function LogsWhatsAppPage() {
    const [messages, setMessages] = useState<MensajeWhatsApp[]>([]);
    const [senders, setSenders] = useState<SenderWhatsApp[]>([]);
    const [loading, setLoading] = useState(false);
    const [meta, setMeta] = useState({ currentPage: 1, totalPages: 0, totalRecords: 0 });
    const [filters, setFilters] = useState<MensajeWhatsAppLogFilters>(emptyFilters);
    const [tempFilters, setTempFilters] = useState<MensajeWhatsAppLogFilters>(emptyFilters);
    const [showFilters, setShowFilters] = useState(false);
    const [eventMessage, setEventMessage] = useState<MensajeWhatsApp | null>(null);
    const [events, setEvents] = useState<EventoEstadoMensajeWhatsApp[]>([]);
    const [loadingEvents, setLoadingEvents] = useState(false);

    const fetchMessages = useCallback(async (page = 1, activeFilters = filters) => {
        setLoading(true);
        try {
            const response = await mensajeWhatsAppService.getByCliente(CLIENTE_WHATSAPP_ID, page, 20, activeFilters);
            if (!response.isSuccess) return toast.error(response.message || 'No se pudieron cargar los logs.');
            setMessages(response.data || []);
            setMeta({ currentPage: response.meta?.currentPage || page, totalPages: response.meta?.totalPages || 0, totalRecords: response.meta?.totalRecords || 0 });
        } catch (error) {
            toast.error(getApiErrorMessage(error, 'No se pudieron cargar los logs de WhatsApp.'));
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => {
        fetchMessages(1, filters);
        senderWhatsAppService.getByCliente(CLIENTE_WHATSAPP_ID, 1, 1000).then(response => setSenders(response.data || []));
    }, [fetchMessages, filters]);

    const openEvents = async (message: MensajeWhatsApp) => {
        setEventMessage(message);
        setLoadingEvents(true);
        try {
            const response = await mensajeWhatsAppService.getEventosEstado(message.mensajeWhatsappId);
            if (!response.isSuccess) return toast.error(response.message || 'No se pudieron cargar los eventos.');
            setEvents(response.data || []);
        } catch (error) {
            toast.error(getApiErrorMessage(error, 'No se pudieron cargar los eventos del mensaje.'));
        } finally {
            setLoadingEvents(false);
        }
    };

    const columns = [
        { header: 'Fecha', width: '165px', render: (row: MensajeWhatsApp) => <span className="text-xs text-slate-600">{row.fecha_creacion ? new Date(row.fecha_creacion).toLocaleString('es-PE') : '-'}</span> },
        { header: 'Receptor / Contacto', render: (row: MensajeWhatsApp) => <div><p className="font-mono text-xs font-bold text-slate-800">{row.numero_receptor || row.contactoWhatsappId || '-'}</p><p className="mt-0.5 line-clamp-1 max-w-md text-[10px] text-slate-500">{row.mensaje || row.contenido || row.plantilla?.nombre_interno || '-'}</p></div> },
        { header: 'Dirección', width: '105px', render: (row: MensajeWhatsApp) => <span className={`text-[10px] font-black uppercase ${row.direccion === 'entrante' ? 'text-violet-700' : 'text-blue-700'}`}>{row.direccion}</span> },
        { header: 'Tipo', width: '105px', render: (row: MensajeWhatsApp) => <span className="text-[10px] font-bold uppercase text-slate-600">{row.tipo.replace('_', ' ')}</span> },
        { header: 'Estado', width: '120px', render: (row: MensajeWhatsApp) => <WhatsAppStatusBadge status={row.estado} /> },
        { header: 'Eventos', width: '80px', className: 'text-center', render: (row: MensajeWhatsApp) => <button type="button" onClick={() => openEvents(row)} className="rounded p-1.5 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600" title="Ver línea de tiempo"><IconEye size={18} /></button> }
    ];

    const activeCount = Object.values(filters).filter(Boolean).length;

    return (
        <div className="p-6">
            <WhatsAppPageHeader title="Logs de WhatsApp" description="Trazabilidad global de mensajes y estados" actions={
                <>
                    <button type="button" onClick={() => fetchMessages(meta.currentPage, filters)} className="rounded-lg border border-slate-300 bg-white p-2.5 text-slate-500 hover:text-emerald-600"><IconRefresh size={19} className={loading ? 'animate-spin' : ''} /></button>
                    <button type="button" onClick={() => { setTempFilters(filters); setShowFilters(true); }} className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-600"><IconFilter size={18} /> Filtros {activeCount > 0 && `(${activeCount})`}</button>
                </>
            } />
            <DataTable columns={columns} data={messages} loading={loading} meta={meta} onPageChange={(page) => fetchMessages(page, filters)} />
            <FiltrosAvanzados isOpen={showFilters} onClose={() => setShowFilters(false)} onApply={() => { setFilters(tempFilters); setShowFilters(false); }} onClear={() => { setTempFilters(emptyFilters); setFilters(emptyFilters); }} totalActive={Object.values(tempFilters).filter(Boolean).length}>
                <SearchableSelect label="Sender" value={tempFilters.senderWhatsappId || ''} options={senders.map(sender => ({ value: sender.senderWhatsappId, label: sender.numero_telefono }))} onChange={(event) => setTempFilters(prev => ({ ...prev, senderWhatsappId: String(event.target.value) }))} placeholder="Todos los números" />
                <SearchableSelect label="Estado" value={tempFilters.estado || ''} options={[...ESTADO_MENSAJE_WHATSAPP_OPTIONS]} onChange={(event) => setTempFilters(prev => ({ ...prev, estado: event.target.value as EstadoMensajeWhatsApp }))} placeholder="Todos los estados" />
                <SearchableSelect label="Dirección" value={tempFilters.direccion || ''} options={[...DIRECCION_MENSAJE_WHATSAPP_OPTIONS]} onChange={(event) => setTempFilters(prev => ({ ...prev, direccion: event.target.value as DireccionMensajeWhatsApp }))} placeholder="Todas las direcciones" />
                <div className="grid grid-cols-2 gap-3">
                    <label className="text-[10px] font-bold uppercase text-slate-500">Desde<input type="date" value={tempFilters.fechaDesde || ''} onChange={(event) => setTempFilters(prev => ({ ...prev, fechaDesde: event.target.value }))} className="mt-1.5 w-full rounded-lg border border-slate-200 p-2.5 text-xs" /></label>
                    <label className="text-[10px] font-bold uppercase text-slate-500">Hasta<input type="date" value={tempFilters.fechaHasta || ''} onChange={(event) => setTempFilters(prev => ({ ...prev, fechaHasta: event.target.value }))} className="mt-1.5 w-full rounded-lg border border-slate-200 p-2.5 text-xs" /></label>
                </div>
            </FiltrosAvanzados>
            <Modal isOpen={!!eventMessage} onClose={() => { setEventMessage(null); setEvents([]); }} title="Línea de tiempo del mensaje" size="md">
                {loadingEvents ? <div className="flex justify-center py-16 text-emerald-600"><IconLoader2 size={32} className="animate-spin" /></div> : (
                    <div className="relative ml-3 border-l-2 border-slate-200 pl-6">
                        {events.map((event, index) => <div key={`${event.estado}-${index}`} className="relative pb-6 last:pb-0"><span className="absolute -left-[31px] top-1 h-3 w-3 rounded-full border-2 border-white bg-emerald-500 ring-2 ring-emerald-100" /><WhatsAppStatusBadge status={event.estado} /><p className="mt-2 text-xs text-slate-600">{event.detalle || 'Estado registrado por el proveedor.'}</p><p className="mt-1 text-[10px] text-slate-400">{event.fecha_evento || event.fecha_creacion ? new Date(event.fecha_evento || event.fecha_creacion || '').toLocaleString('es-PE') : '-'}</p></div>)}
                        {!events.length && <p className="py-8 text-center text-sm italic text-slate-400">Sin eventos registrados.</p>}
                    </div>
                )}
            </Modal>
        </div>
    );
}
