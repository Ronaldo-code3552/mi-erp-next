"use client";

import { useEffect, useRef, useState } from 'react';
import { IconAlertTriangle, IconCheck, IconChecks, IconLoader2, IconLock, IconX } from '@tabler/icons-react';
import { toast } from 'sonner';
import Modal from '@/components/ui/Modal';
import { mensajeWhatsAppService } from '@/services/mensajeWhatsAppService';
import { conversacionWhatsAppService } from '@/services/conversacionWhatsAppService';
import { getApiErrorMessage } from '@/lib/whatsappConfig';
import { ConversacionWhatsApp, EventoEstadoMensajeWhatsApp, MensajeWhatsApp, SenderWhatsApp } from '@/types';
import WhatsAppStatusBadge from '../../components/WhatsAppStatusBadge';
import ComponerMensajeBar from './ComponerMensajeBar';

const StateIcon = ({ message }: { message: MensajeWhatsApp }) => {
    if (message.estado === 'fallido') return <IconAlertTriangle size={13} className="text-rose-500" />;
    if (message.estado === 'leido') return <IconChecks size={14} className="text-sky-500" />;
    if (message.estado === 'entregado') return <IconChecks size={14} className="text-slate-500" />;
    return <IconCheck size={13} className="text-slate-400" />;
};

export default function MensajeThreadPane({ sender, conversation, onClosed }: {
    sender: SenderWhatsApp;
    conversation: ConversacionWhatsApp;
    onClosed: () => void;
}) {
    const [messages, setMessages] = useState<MensajeWhatsApp[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);
    const [events, setEvents] = useState<EventoEstadoMensajeWhatsApp[]>([]);
    const [eventMessage, setEventMessage] = useState<MensajeWhatsApp | null>(null);
    const bottomRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        let active = true;
        mensajeWhatsAppService.getByConversacion(conversation.conversacionWhatsappId, 1, 200)
            .then(response => { if (active && response.isSuccess) setMessages(response.data || []); })
            .catch(error => toast.error(getApiErrorMessage(error, 'No se pudo cargar el hilo.')))
            .finally(() => active && setLoading(false));
        return () => { active = false; };
    }, [conversation.conversacionWhatsappId, refreshKey]);

    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    const closeConversation = async () => {
        try {
            const response = await conversacionWhatsAppService.cerrar(conversation.conversacionWhatsappId);
            if (!response.isSuccess) return toast.error(response.message || 'No se pudo cerrar la conversación.');
            toast.success('Conversación marcada como resuelta.');
            onClosed();
        } catch (error) {
            toast.error(getApiErrorMessage(error, 'No se pudo cerrar la conversación.'));
        }
    };

    const openEvents = async (message: MensajeWhatsApp) => {
        setEventMessage(message);
        try {
            const response = await mensajeWhatsAppService.getEventosEstado(message.mensajeWhatsappId);
            setEvents(response.data || []);
        } catch (error) {
            toast.error(getApiErrorMessage(error, 'No se pudieron cargar los eventos.'));
        }
    };

    return (
        <div className="flex h-full min-h-0 flex-col bg-slate-50">
            <div className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3">
                <div><p className="text-sm font-bold text-slate-800">{conversation.contacto?.nombre || conversation.nombre_contacto || 'Contacto WhatsApp'}</p><p className="font-mono text-[10px] text-slate-400">{conversation.contacto?.numero_telefono || conversation.numero_telefono}</p></div>
                {conversation.estado === 'abierta' && <button type="button" onClick={closeConversation} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"><IconLock size={15} /> Marcar como resuelto</button>}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-5">
                {loading ? <div className="flex justify-center py-20 text-emerald-600"><IconLoader2 size={30} className="animate-spin" /></div> : (
                    <div className="space-y-3">
                        {messages.map(message => {
                            const outgoing = message.direccion === 'saliente';
                            return <div key={message.mensajeWhatsappId} className={`flex ${outgoing ? 'justify-end' : 'justify-start'}`}><button type="button" onClick={() => openEvents(message)} className={`max-w-[76%] rounded-lg px-3 py-2 text-left shadow-sm ${outgoing ? 'bg-emerald-100 text-emerald-950' : 'border border-slate-200 bg-white text-slate-800'}`}><p className="whitespace-pre-wrap text-xs leading-relaxed">{message.mensaje || message.contenido || message.plantilla?.cuerpo_texto || '[Mensaje sin contenido]'}</p><div className="mt-1 flex items-center justify-end gap-1 text-[9px] text-slate-500"><span>{message.fecha_creacion ? new Date(message.fecha_creacion).toLocaleTimeString('es-PE', { hour: '2-digit', minute: '2-digit' }) : ''}</span>{outgoing && <StateIcon message={message} />}</div></button></div>;
                        })}
                        {!messages.length && <p className="py-20 text-center text-xs italic text-slate-400">Esta conversación aún no tiene mensajes.</p>}
                        <div ref={bottomRef} />
                    </div>
                )}
            </div>
            <div className="border-t border-slate-200 bg-white p-4"><ComponerMensajeBar sender={sender} conversation={conversation} onSent={() => setRefreshKey(key => key + 1)} /></div>
            <Modal isOpen={!!eventMessage} onClose={() => { setEventMessage(null); setEvents([]); }} title="Estados del mensaje" size="sm">
                <div className="space-y-3">{events.map((event, index) => <div key={`${event.estado}-${index}`} className="flex items-start gap-3 rounded-lg border border-slate-200 p-3"><WhatsAppStatusBadge status={event.estado} /><div className="min-w-0 flex-1"><p className="text-xs text-slate-600">{event.detalle || 'Estado registrado'}</p><p className="mt-1 text-[10px] text-slate-400">{event.fecha_evento || event.fecha_creacion ? new Date(event.fecha_evento || event.fecha_creacion || '').toLocaleString('es-PE') : '-'}</p></div></div>)}{!events.length && <div className="flex items-center justify-center gap-2 py-8 text-xs text-slate-400"><IconX size={15} /> Sin eventos</div>}</div>
            </Modal>
        </div>
    );
}
