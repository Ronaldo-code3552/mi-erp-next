"use client";

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { IconArrowRight, IconBrandWhatsapp, IconChecks, IconClock, IconLoader2, IconMessages, IconPhoneCheck } from '@tabler/icons-react';
import { mensajeWhatsAppService } from '@/services/mensajeWhatsAppService';
import { senderWhatsAppService } from '@/services/senderWhatsAppService';
import { conversacionWhatsAppService } from '@/services/conversacionWhatsAppService';
import { CLIENTE_WHATSAPP_ID } from '@/lib/whatsappConfig';
import { EstadoSenderWhatsApp } from '@/types';
import ReportCard from '@/components/shared/ReportCard';
import WhatsAppPageHeader from './components/WhatsAppPageHeader';

interface Metrics {
    sentToday: number;
    deliveryRate: number;
    openConversations: number;
    senderStates: Record<EstadoSenderWhatsApp, number>;
}

const initialMetrics: Metrics = { sentToday: 0, deliveryRate: 0, openConversations: 0, senderStates: { pendiente: 0, verificado: 0, activo: 0, suspendido: 0 } };

const MetricCard = ({ title, value, detail, icon, color }: { title: string; value: string | number; detail: string; icon: React.ReactNode; color: string }) => (
    <ReportCard compact title={title} icon={icon} gradientClass={color}>
        <div><p className="text-3xl font-black text-slate-900">{value}</p><p className="mt-1 text-xs text-slate-500">{detail}</p></div>
    </ReportCard>
);

export default function WhatsAppOverviewPage() {
    const [metrics, setMetrics] = useState(initialMetrics);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;
        const load = async () => {
            const today = new Date().toISOString().slice(0, 10);
            const [messageResponse, senderResponse] = await Promise.all([
                mensajeWhatsAppService.getByCliente(CLIENTE_WHATSAPP_ID, 1, 1000, { fechaDesde: today, fechaHasta: today }),
                senderWhatsAppService.getByCliente(CLIENTE_WHATSAPP_ID, 1, 1000)
            ]);
            if (!active) return;
            const messages = messageResponse.data || [];
            const senders = senderResponse.data || [];
            const outgoing = messages.filter(message => message.direccion === 'saliente');
            const processed = outgoing.filter(message => ['enviado', 'entregado', 'leido'].includes(message.estado));
            const delivered = outgoing.filter(message => ['entregado', 'leido'].includes(message.estado));
            const conversations = await Promise.all(senders.map(sender => conversacionWhatsAppService.getBySender(sender.senderWhatsappId, 'abierta', 1, 1000)));
            if (!active) return;
            const senderStates = { pendiente: 0, verificado: 0, activo: 0, suspendido: 0 } as Record<EstadoSenderWhatsApp, number>;
            senders.forEach(sender => { senderStates[sender.estado] += 1; });
            setMetrics({ sentToday: outgoing.length, deliveryRate: processed.length ? Math.round((delivered.length / processed.length) * 100) : 0, openConversations: conversations.reduce((total, response) => total + (response.data?.length || 0), 0), senderStates });
        };
        load().finally(() => active && setLoading(false));
        return () => { active = false; };
    }, []);

    return (
        <div className="p-6">
            <WhatsAppPageHeader title="WhatsApp" description="Operación, atención y trazabilidad de mensajería" />
            {loading ? <div className="flex min-h-[360px] items-center justify-center text-emerald-600"><IconLoader2 size={38} className="animate-spin" /></div> : (
                <>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                        <MetricCard title="Mensajes enviados hoy" value={metrics.sentToday} detail="Mensajes salientes registrados" icon={<IconBrandWhatsapp size={23} />} color="bg-emerald-600" />
                        <MetricCard title="Tasa de entrega" value={`${metrics.deliveryRate}%`} detail="Entregados y leídos / procesados" icon={<IconChecks size={23} />} color="bg-sky-600" />
                        <MetricCard title="Conversaciones abiertas" value={metrics.openConversations} detail="Pendientes de atención o cierre" icon={<IconMessages size={23} />} color="bg-violet-600" />
                        <MetricCard title="Senders activos" value={metrics.senderStates.activo} detail={`${metrics.senderStates.pendiente} pendientes · ${metrics.senderStates.suspendido} suspendidos`} icon={<IconPhoneCheck size={23} />} color="bg-amber-600" />
                    </div>
                    <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[1.25fr_0.75fr]">
                        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-sm font-black uppercase text-slate-700">Accesos operativos</h2><div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">{[
                            { href: '/dashboard/whatsapp/enviar', label: 'Enviar mensaje', detail: 'Nuevo contacto o número' },
                            { href: '/dashboard/whatsapp/conversaciones', label: 'Conversaciones', detail: 'Atender bandeja' },
                            { href: '/dashboard/whatsapp/logs', label: 'Revisar logs', detail: 'Estados y eventos' }
                        ].map(item => <Link key={item.href} href={item.href} className="group rounded-lg border border-slate-200 p-4 hover:border-emerald-300 hover:bg-emerald-50"><div className="flex items-center justify-between"><p className="text-xs font-bold text-slate-800">{item.label}</p><IconArrowRight size={16} className="text-slate-300 group-hover:text-emerald-600" /></div><p className="mt-1 text-[10px] text-slate-500">{item.detail}</p></Link>)}</div></div>
                        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"><h2 className="flex items-center gap-2 text-sm font-black uppercase text-slate-700"><IconClock size={18} /> Estado de números</h2><div className="mt-4 space-y-3">{Object.entries(metrics.senderStates).map(([status, count]) => <div key={status} className="flex items-center justify-between border-b border-slate-100 pb-2 text-xs last:border-0"><span className="font-semibold uppercase text-slate-500">{status}</span><span className="font-black text-slate-800">{count}</span></div>)}</div></div>
                    </div>
                </>
            )}
        </div>
    );
}
