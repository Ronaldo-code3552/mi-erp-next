"use client";

import { useState } from 'react';
import { ConversacionWhatsApp, SenderWhatsApp } from '@/types';
import SendMessageComposer from '../../components/SendMessageComposer';

export default function ComponerMensajeBar({ sender, conversation, onSent }: {
    sender: SenderWhatsApp;
    conversation: ConversacionWhatsApp;
    onSent: () => void;
}) {
    const [renderedAt] = useState(() => Date.now());
    const expiresAt = conversation.ventana_expira_en ? new Date(conversation.ventana_expira_en).getTime() : 0;
    return (
        <SendMessageComposer
            compact
            fixedSender={sender}
            fixedNumber={conversation.contacto?.numero_telefono || conversation.numero_telefono || ''}
            fixedOptIn={conversation.contacto?.opt_in}
            fixedWindowOpen={expiresAt > renderedAt}
            onSent={onSent}
        />
    );
}
