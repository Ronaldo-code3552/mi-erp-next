"use client";

import { useEffect, useState } from 'react';
import Modal from '@/components/ui/Modal';
import ValidatedFormInput from '@/components/forms/ValidatedFormInput';
import { contactoWhatsAppService } from '@/services/contactoWhatsAppService';
import { CLIENTE_WHATSAPP_ID, getApiErrorMessage } from '@/lib/whatsappConfig';
import { ContactoWhatsApp } from '@/types';
import { IconDeviceFloppy, IconLoader2 } from '@tabler/icons-react';
import { toast } from 'sonner';

interface Props {
    isOpen: boolean;
    contactToEdit: ContactoWhatsApp | null;
    onClose: () => void;
    onSuccess: () => void;
}

export default function ContactoWhatsAppFormModal({ isOpen, contactToEdit, onClose, onSuccess }: Props) {
    const [nombre, setNombre] = useState('');
    const [numero, setNumero] = useState('');
    const [optIn, setOptIn] = useState(true);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        setNombre(contactToEdit?.nombre || '');
        setNumero(contactToEdit?.numero_telefono || '');
        setOptIn(contactToEdit?.opt_in ?? true);
    }, [isOpen, contactToEdit]);

    const submit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!contactToEdit && !numero.trim()) return toast.error('El número de teléfono es obligatorio.');
        setLoading(true);
        try {
            const response = contactToEdit
                ? await contactoWhatsAppService.update(contactToEdit.contactoWhatsappId, { nombre: nombre.trim() || undefined })
                : await contactoWhatsAppService.create({ clienteWhatsappId: CLIENTE_WHATSAPP_ID, numero_telefono: numero.trim(), nombre: nombre.trim() || undefined, opt_in: optIn });
            if (!response.isSuccess) return toast.error(response.message || 'No se pudo guardar el contacto.');
            toast.success(contactToEdit ? 'Contacto actualizado correctamente.' : 'Contacto creado correctamente.');
            onSuccess();
            onClose();
        } catch (error) {
            toast.error(getApiErrorMessage(error, 'No se pudo guardar el contacto.'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={contactToEdit ? 'Editar contacto' : 'Nuevo contacto de WhatsApp'} size="sm">
            <form onSubmit={submit} className="space-y-4">
                <ValidatedFormInput label="Nombre" value={nombre} onChange={(event) => setNombre(event.target.value)} placeholder="Nombre del contacto" />
                <ValidatedFormInput label="Número de teléfono *" value={numero} onChange={(event) => setNumero(event.target.value)} disabled={!!contactToEdit} placeholder="+51999999999" />
                {!contactToEdit && (
                    <label className="flex cursor-pointer items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <div><p className="text-xs font-bold text-slate-700">Consentimiento (opt-in)</p><p className="mt-0.5 text-[10px] text-slate-500">El contacto autorizó recibir comunicaciones.</p></div>
                        <input type="checkbox" checked={optIn} onChange={(event) => setOptIn(event.target.checked)} className="h-4 w-4 accent-emerald-600" />
                    </label>
                )}
                <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold text-slate-500">Cancelar</button>
                    <button type="submit" disabled={loading} className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white disabled:opacity-50">{loading ? <IconLoader2 size={16} className="animate-spin" /> : <IconDeviceFloppy size={16} />} Guardar</button>
                </div>
            </form>
        </Modal>
    );
}
