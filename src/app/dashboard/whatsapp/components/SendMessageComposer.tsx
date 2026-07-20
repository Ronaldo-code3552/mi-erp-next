"use client";

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import Swal from 'sweetalert2';
import { IconAlertTriangle, IconLoader2, IconSend } from '@tabler/icons-react';
import SearchableSelect from '@/components/forms/SearchableSelect';
import ValidatedFormInput from '@/components/forms/ValidatedFormInput';
import { useDebounce } from '@/hooks/useDebounce';
import { senderWhatsAppService } from '@/services/senderWhatsAppService';
import { contactoWhatsAppService } from '@/services/contactoWhatsAppService';
import { plantillaWhatsAppService } from '@/services/plantillaWhatsAppService';
import { conversacionWhatsAppService } from '@/services/conversacionWhatsAppService';
import { mensajeWhatsAppService } from '@/services/mensajeWhatsAppService';
import { CLIENTE_WHATSAPP_ID, getApiErrorMessage } from '@/lib/whatsappConfig';
import { ContactoWhatsApp, PlantillaWhatsApp, SenderWhatsApp } from '@/types';

type WindowStatus = 'idle' | 'checking' | 'open' | 'closed';

interface Props {
    fixedSender?: SenderWhatsApp;
    fixedNumber?: string;
    fixedOptIn?: boolean;
    fixedWindowOpen?: boolean;
    compact?: boolean;
    onSent?: (mensajeWhatsappId: string) => void;
}

const normalizePhone = (value: string) => value.replace(/[^0-9+]/g, '');

export default function SendMessageComposer({ fixedSender, fixedNumber, fixedOptIn, fixedWindowOpen, compact = false, onSent }: Props) {
    const [senders, setSenders] = useState<SenderWhatsApp[]>([]);
    const [templates, setTemplates] = useState<PlantillaWhatsApp[]>([]);
    const [senderId, setSenderId] = useState(fixedSender?.senderWhatsappId || '');
    const [number, setNumber] = useState(fixedNumber || '');
    const [optIn, setOptIn] = useState<boolean | undefined>(fixedOptIn);
    const [templateId, setTemplateId] = useState('');
    const [message, setMessage] = useState('');
    const [windowStatus, setWindowStatus] = useState<WindowStatus>(fixedWindowOpen === undefined ? 'idle' : fixedWindowOpen ? 'open' : 'closed');
    const [sending, setSending] = useState(false);
    const debouncedNumber = useDebounce(number, 550);

    useEffect(() => {
        let active = true;
        Promise.all([
            fixedSender ? Promise.resolve({ isSuccess: true, data: [fixedSender] }) : senderWhatsAppService.getByCliente(CLIENTE_WHATSAPP_ID, 1, 1000, 'activo'),
            plantillaWhatsAppService.getAll(1, 1000, '', { clienteWhatsappId: CLIENTE_WHATSAPP_ID, estadoAprobacion: ['aprobado'] })
        ]).then(([senderResponse, templateResponse]) => {
            if (!active) return;
            setSenders((senderResponse.data || []).filter(sender => sender.estado === 'activo'));
            setTemplates((templateResponse.data || []).filter(template => template.estado_aprobacion === 'aprobado'));
        }).catch(() => toast.error('No se pudieron cargar los datos del compositor.'));
        return () => { active = false; };
    }, [fixedSender]);

    useEffect(() => {
        if (fixedSender) setSenderId(fixedSender.senderWhatsappId);
        if (fixedNumber !== undefined) setNumber(fixedNumber);
        if (fixedOptIn !== undefined) setOptIn(fixedOptIn);
        if (fixedWindowOpen !== undefined) setWindowStatus(fixedWindowOpen ? 'open' : 'closed');
    }, [fixedNumber, fixedOptIn, fixedSender, fixedWindowOpen]);

    useEffect(() => {
        if (fixedWindowOpen !== undefined || !senderId || !debouncedNumber.trim()) return;
        let active = true;
        const checkWindow = async () => {
            setWindowStatus('checking');
            try {
                const response = await conversacionWhatsAppService.getBySender(senderId, 'abierta', 1, 1000);
                if (!active) return;
                const phone = normalizePhone(debouncedNumber);
                const conversation = (response.data || []).find(item => normalizePhone(item.contacto?.numero_telefono || item.numero_telefono || '') === phone);
                const expiresAt = conversation?.ventana_expira_en ? new Date(conversation.ventana_expira_en).getTime() : 0;
                setWindowStatus(conversation && expiresAt > Date.now() ? 'open' : 'closed');
            } catch {
                if (active) setWindowStatus('closed');
            }
        };
        checkWindow();
        return () => { active = false; };
    }, [debouncedNumber, fixedWindowOpen, senderId]);

    const templateRequired = windowStatus !== 'open';
    const selectedTemplate = useMemo(() => templates.find(template => template.plantillaWhatsappId === templateId), [templateId, templates]);
    const canSend = !!senderId && !!number.trim() && !sending && (templateRequired ? !!templateId : !!message.trim() || !!templateId);

    const submit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!canSend) return toast.error(templateRequired ? 'Seleccione una plantilla aprobada para enviar fuera de la ventana de 24 horas.' : 'Complete el mensaje o seleccione una plantilla.');
        if (optIn === false) {
            const confirmation = await Swal.fire({
                title: 'Contacto sin opt-in',
                text: 'El contacto no tiene consentimiento activo. ¿Desea continuar con el envío?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Sí, continuar',
                cancelButtonText: 'Cancelar',
                confirmButtonColor: '#d97706'
            });
            if (!confirmation.isConfirmed) return;
        }
        setSending(true);
        try {
            const response = await mensajeWhatsAppService.enviar({
                senderWhatsappId: senderId,
                numeroReceptor: number.trim(),
                plantillaWhatsappId: templateId || undefined,
                mensaje: templateRequired ? undefined : message.trim() || undefined
            });
            if (!response.isSuccess) return toast.error(response.message || 'No se pudo enviar el mensaje.');
            toast.success(`Mensaje encolado correctamente (${response.data.mensajeWhatsappId}).`);
            setMessage('');
            if (!fixedNumber) setNumber('');
            setTemplateId('');
            onSent?.(response.data.mensajeWhatsappId);
        } catch (error) {
            toast.error(getApiErrorMessage(error, 'No se pudo enviar el mensaje.'));
        } finally {
            setSending(false);
        }
    };

    return (
        <form onSubmit={submit} className={compact ? 'space-y-3' : 'space-y-5'}>
            {!fixedSender && (
                <SearchableSelect label="Número emisor *" value={senderId} options={senders.map(sender => ({ value: sender.senderWhatsappId, label: sender.numero_telefono, aux: sender.proveedor }))} onChange={(event) => { setSenderId(String(event.target.value)); setWindowStatus('idle'); }} placeholder="Seleccione un sender activo" />
            )}
            {!fixedNumber && (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-[0.9fr_1.1fr]">
                    <SearchableSelect
                        label="Contacto existente (opcional)"
                        value=""
                        fetchCustom={async (term) => {
                            const response = await contactoWhatsAppService.getByCliente(CLIENTE_WHATSAPP_ID, 1, 20, term);
                            return (response.data || []).map(contact => ({ value: contact.contactoWhatsappId, label: contact.nombre || contact.numero_telefono, aux: contact.numero_telefono, raw: contact }));
                        }}
                        onChange={(event) => {
                            const contact = event.option?.raw as ContactoWhatsApp | undefined;
                            if (contact) { setNumber(contact.numero_telefono); setOptIn(contact.opt_in); }
                        }}
                        placeholder="Buscar contacto..."
                    />
                    <ValidatedFormInput label="Número receptor *" value={number} onChange={(event) => { setNumber(event.target.value); setOptIn(undefined); }} placeholder="+51999999999" />
                </div>
            )}

            {optIn === false && <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800"><IconAlertTriangle size={17} className="mt-0.5 shrink-0" /><span><strong>Contacto sin opt-in.</strong> El envío está permitido por la API, pero requiere confirmación consciente.</span></div>}

            <div className={`rounded-lg border p-3 text-xs ${windowStatus === 'open' ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : windowStatus === 'checking' ? 'border-sky-200 bg-sky-50 text-sky-700' : 'border-amber-200 bg-amber-50 text-amber-800'}`}>
                {windowStatus === 'open' ? 'Ventana de 24 horas abierta: puede enviar texto libre o una plantilla.' : windowStatus === 'checking' ? 'Verificando ventana de conversación...' : 'Sin ventana abierta: debe usar una plantilla aprobada.'}
            </div>

            <SearchableSelect label={templateRequired ? 'Plantilla aprobada *' : 'Plantilla aprobada (opcional)'} value={templateId} options={templates.map(template => ({ value: template.plantillaWhatsappId, label: template.nombre_interno, aux: template.categoria }))} onChange={(event) => setTemplateId(String(event.target.value))} placeholder="Seleccione una plantilla aprobada" />
            {selectedTemplate && <div className="rounded-lg border border-slate-200 bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase text-slate-400">Vista previa</p><p className="mt-1 whitespace-pre-wrap text-xs text-slate-700">{selectedTemplate.cuerpo_texto}</p></div>}

            {!templateRequired && (
                <div>
                    <label className="mb-1.5 block text-[10px] font-bold uppercase text-slate-500">Mensaje libre</label>
                    <textarea rows={compact ? 3 : 6} value={message} onChange={(event) => setMessage(event.target.value)} className="w-full resize-none rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-emerald-500" placeholder="Escriba el mensaje..." />
                </div>
            )}

            <div className="flex justify-end">
                <button type="submit" disabled={!canSend} className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-40">
                    {sending ? <IconLoader2 size={17} className="animate-spin" /> : <IconSend size={17} />} Enviar mensaje
                </button>
            </div>
        </form>
    );
}
