"use client";

import WhatsAppPageHeader from '../components/WhatsAppPageHeader';
import SendMessageComposer from '../components/SendMessageComposer';

export default function EnviarWhatsAppPage() {
    return (
        <div className="p-6">
            <WhatsAppPageHeader title="Enviar por WhatsApp" description="Compositor con control de ventana, consentimiento y plantillas" />
            <div className="mx-auto max-w-4xl rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
                <SendMessageComposer />
            </div>
        </div>
    );
}
