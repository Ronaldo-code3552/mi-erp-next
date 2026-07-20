"use client";

import { useEffect, useState } from 'react';
import { IconClock, IconLoader2, IconMessageCircle } from '@tabler/icons-react';
import { toast } from 'sonner';
import { conversacionWhatsAppService } from '@/services/conversacionWhatsAppService';
import { getApiErrorMessage } from '@/lib/whatsappConfig';
import { ConversacionWhatsApp, EstadoConversacionWhatsApp } from '@/types';
import WhatsAppStatusBadge from '../../components/WhatsAppStatusBadge';

interface Props {
    senderWhatsappId: string;
    selectedId?: string;
    refreshKey: number;
    onSelect: (conversation: ConversacionWhatsApp) => void;
}

const windowLabel = (expires: string | null | undefined, now: number) => {
    if (!expires) return 'Sin ventana';
    const minutes = Math.floor((new Date(expires).getTime() - now) / 60000);
    if (minutes <= 0) return 'Ventana cerrada';
    if (minutes < 60) return `${minutes} min restantes`;
    return `${Math.floor(minutes / 60)} h restantes`;
};

export default function ConversacionListPane({ senderWhatsappId, selectedId, refreshKey, onSelect }: Props) {
    const [items, setItems] = useState<ConversacionWhatsApp[]>([]);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState<EstadoConversacionWhatsApp | undefined>('abierta');
    const [renderedAt] = useState(() => Date.now());

    useEffect(() => {
        let active = true;
        conversacionWhatsAppService.getBySender(senderWhatsappId, status, 1, 100)
            .then(response => {
                if (!active) return;
                if (response.isSuccess) setItems(response.data || []);
                else toast.error(response.message || 'No se pudieron cargar las conversaciones.');
            })
            .catch(error => toast.error(getApiErrorMessage(error, 'No se pudieron cargar las conversaciones.')))
            .finally(() => active && setLoading(false));
        return () => { active = false; };
    }, [refreshKey, senderWhatsappId, status]);

    return (
        <div className="flex h-full min-h-0 flex-col border-r border-slate-200 bg-white">
            <div className="flex gap-1 border-b border-slate-200 p-2">
                {(['abierta', 'cerrada'] as EstadoConversacionWhatsApp[]).map(value => <button key={value} type="button" onClick={() => setStatus(value)} className={`flex-1 rounded-md px-2 py-2 text-[10px] font-black uppercase ${status === value ? 'bg-emerald-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>{value}</button>)}
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
                {loading ? <div className="flex justify-center py-16 text-emerald-600"><IconLoader2 size={28} className="animate-spin" /></div> : items.map(item => {
                    const number = item.contacto?.numero_telefono || item.numero_telefono || item.contactoWhatsappId;
                    const name = item.contacto?.nombre || item.nombre_contacto || number;
                    const expiresSoon = item.ventana_expira_en && new Date(item.ventana_expira_en).getTime() - renderedAt < 60 * 60 * 1000;
                    return (
                        <button key={item.conversacionWhatsappId} type="button" onClick={() => onSelect(item)} className={`w-full border-b border-slate-100 p-3 text-left transition-colors ${selectedId === item.conversacionWhatsappId ? 'bg-emerald-50' : 'hover:bg-slate-50'}`}>
                            <div className="flex items-start gap-3">
                                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500"><IconMessageCircle size={18} /></div>
                                <div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate text-xs font-bold text-slate-800">{name}</p><p className="truncate font-mono text-[10px] text-slate-400">{number}</p></div><WhatsAppStatusBadge status={item.estado} /></div><div className={`mt-2 flex items-center gap-1 text-[10px] ${expiresSoon ? 'font-bold text-amber-600' : 'text-slate-400'}`}><IconClock size={12} />{windowLabel(item.ventana_expira_en, renderedAt)}</div></div>
                            </div>
                        </button>
                    );
                })}
                {!loading && !items.length && <div className="px-5 py-16 text-center text-xs italic text-slate-400">No hay conversaciones para este estado.</div>}
            </div>
        </div>
    );
}
