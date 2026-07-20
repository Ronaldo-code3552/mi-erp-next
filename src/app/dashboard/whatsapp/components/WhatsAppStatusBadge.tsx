import {
    EstadoAprobacionPlantilla,
    EstadoConversacionWhatsApp,
    EstadoMensajeWhatsApp,
    EstadoSenderWhatsApp
} from '@/types';

type WhatsAppStatus = EstadoSenderWhatsApp | EstadoAprobacionPlantilla | EstadoConversacionWhatsApp | EstadoMensajeWhatsApp;

const STATUS_CLASSES: Record<WhatsAppStatus, string> = {
    pendiente: 'border-amber-200 bg-amber-50 text-amber-700',
    verificado: 'border-sky-200 bg-sky-50 text-sky-700',
    activo: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    suspendido: 'border-rose-200 bg-rose-50 text-rose-700',
    borrador: 'border-slate-200 bg-slate-50 text-slate-600',
    en_revision: 'border-amber-200 bg-amber-50 text-amber-700',
    aprobado: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    rechazado: 'border-rose-200 bg-rose-50 text-rose-700',
    abierta: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    cerrada: 'border-slate-200 bg-slate-100 text-slate-600',
    encolado: 'border-slate-200 bg-slate-100 text-slate-600',
    enviado: 'border-blue-200 bg-blue-50 text-blue-700',
    entregado: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    leido: 'border-green-300 bg-green-100 text-green-800',
    fallido: 'border-red-200 bg-red-50 text-red-700',
    recibido: 'border-violet-200 bg-violet-50 text-violet-700'
};

export default function WhatsAppStatusBadge({ status }: { status: WhatsAppStatus }) {
    return (
        <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black uppercase ${STATUS_CLASSES[status]}`}>
            {status.replace('_', ' ')}
        </span>
    );
}
