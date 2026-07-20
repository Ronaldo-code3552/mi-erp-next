"use client";

import { useEffect, useState } from 'react';
import { IconMessages } from '@tabler/icons-react';
import SearchableSelect from '@/components/forms/SearchableSelect';
import { senderWhatsAppService } from '@/services/senderWhatsAppService';
import { CLIENTE_WHATSAPP_ID } from '@/lib/whatsappConfig';
import { ConversacionWhatsApp, SenderWhatsApp } from '@/types';
import WhatsAppPageHeader from '../components/WhatsAppPageHeader';
import ConversacionListPane from './components/ConversacionListPane';
import MensajeThreadPane from './components/MensajeThreadPane';

export default function ConversacionesWhatsAppPage() {
    const [senders, setSenders] = useState<SenderWhatsApp[]>([]);
    const [senderId, setSenderId] = useState('');
    const [selected, setSelected] = useState<ConversacionWhatsApp | null>(null);
    const [refreshKey, setRefreshKey] = useState(0);

    useEffect(() => {
        senderWhatsAppService.getByCliente(CLIENTE_WHATSAPP_ID, 1, 1000, 'activo').then(response => {
            const activeSenders = (response.data || []).filter(sender => sender.estado === 'activo');
            setSenders(activeSenders);
            if (activeSenders.length) setSenderId(current => current || activeSenders[0].senderWhatsappId);
        });
    }, []);

    const sender = senders.find(item => item.senderWhatsappId === senderId);

    return (
        <div className="p-6">
            <WhatsAppPageHeader title="Conversaciones de WhatsApp" description="Bandeja de atención y seguimiento de contactos" actions={<div className="w-72"><SearchableSelect value={senderId} options={senders.map(item => ({ value: item.senderWhatsappId, label: item.numero_telefono, aux: item.proveedor }))} onChange={(event) => { setSenderId(String(event.target.value)); setSelected(null); }} placeholder="Seleccione un sender activo" /></div>} />
            <div className="grid h-[calc(100vh-175px)] min-h-[600px] overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm md:grid-cols-[340px_minmax(0,1fr)]">
                {senderId ? <ConversacionListPane key={senderId} senderWhatsappId={senderId} selectedId={selected?.conversacionWhatsappId} refreshKey={refreshKey} onSelect={setSelected} /> : <div className="flex items-center justify-center border-r border-slate-200 text-xs text-slate-400">No hay senders activos.</div>}
                {selected && sender ? <MensajeThreadPane key={selected.conversacionWhatsappId} sender={sender} conversation={selected} onClosed={() => { setSelected(null); setRefreshKey(key => key + 1); }} /> : <div className="flex flex-col items-center justify-center gap-3 bg-slate-50 text-slate-400"><IconMessages size={46} stroke={1.3} /><p className="text-sm font-semibold">Seleccione una conversación</p></div>}
            </div>
        </div>
    );
}
