"use client";

import { useEffect, useState } from 'react';
import Modal from '@/components/ui/Modal';
import ValidatedFormInput from '@/components/forms/ValidatedFormInput';
import SearchableSelect from '@/components/forms/SearchableSelect';
import { senderWhatsAppService } from '@/services/senderWhatsAppService';
import { CLIENTE_WHATSAPP_ID, getApiErrorMessage } from '@/lib/whatsappConfig';
import { ProveedorWhatsApp, SenderWhatsApp } from '@/types';
import { PROVEEDOR_WHATSAPP_OPTIONS } from '@/utils/selectOptions';
import { IconDeviceFloppy, IconLoader2, IconLock } from '@tabler/icons-react';
import { toast } from 'sonner';

interface Props {
    isOpen: boolean;
    senderToEdit: SenderWhatsApp | null;
    onClose: () => void;
    onSuccess: () => void;
}

const initialForm = {
    proveedor: 'meta_whatsapp' as ProveedorWhatsApp,
    numero_telefono: '',
    waba_id: '',
    phone_number_id: '',
    twilio_account_sid: '',
    access_token_cifrado: ''
};

export default function SenderWhatsAppFormModal({ isOpen, senderToEdit, onClose, onSuccess }: Props) {
    const [form, setForm] = useState(initialForm);
    const [loading, setLoading] = useState(false);
    const isEditing = !!senderToEdit;

    useEffect(() => {
        if (!isOpen) return;
        setForm(senderToEdit ? {
            proveedor: senderToEdit.proveedor,
            numero_telefono: senderToEdit.numero_telefono,
            waba_id: senderToEdit.waba_id || '',
            phone_number_id: senderToEdit.phone_number_id || '',
            twilio_account_sid: senderToEdit.twilio_account_sid || '',
            access_token_cifrado: ''
        } : initialForm);
    }, [isOpen, senderToEdit]);

    const submit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!form.numero_telefono.trim()) return toast.error('El número de teléfono es obligatorio.');
        if (!isEditing && !form.access_token_cifrado.trim()) return toast.error('El token de acceso es obligatorio.');

        setLoading(true);
        try {
            const response = isEditing
                ? await senderWhatsAppService.update(senderToEdit.senderWhatsappId, {
                    waba_id: form.waba_id || undefined,
                    phone_number_id: form.phone_number_id || undefined,
                    twilio_account_sid: form.twilio_account_sid || undefined,
                    access_token_cifrado: form.access_token_cifrado || undefined
                })
                : await senderWhatsAppService.create({
                    clienteWhatsappId: CLIENTE_WHATSAPP_ID,
                    proveedor: form.proveedor,
                    numero_telefono: form.numero_telefono.trim(),
                    waba_id: form.waba_id || undefined,
                    phone_number_id: form.phone_number_id || undefined,
                    twilio_account_sid: form.twilio_account_sid || undefined,
                    access_token_cifrado: form.access_token_cifrado
                });

            if (!response.isSuccess) return toast.error(response.message || 'No se pudo guardar el número.');
            toast.success(isEditing ? 'Número actualizado correctamente.' : 'Número registrado correctamente.');
            onSuccess();
            onClose();
        } catch (error) {
            toast.error(getApiErrorMessage(error, 'No se pudo guardar el número de WhatsApp.'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? 'Editar número de WhatsApp' : 'Registrar número de WhatsApp'} size="md">
            <form onSubmit={submit} className="space-y-4">
                <SearchableSelect
                    label="Proveedor"
                    name="proveedor"
                    value={form.proveedor}
                    options={[...PROVEEDOR_WHATSAPP_OPTIONS]}
                    onChange={(event) => setForm(prev => ({ ...prev, proveedor: event.target.value as ProveedorWhatsApp }))}
                    disabled={isEditing}
                />
                <ValidatedFormInput label="Número de teléfono *" value={form.numero_telefono} onChange={(event) => setForm(prev => ({ ...prev, numero_telefono: event.target.value }))} disabled={isEditing} placeholder="+51999999999" />
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <ValidatedFormInput label="WABA ID" value={form.waba_id} onChange={(event) => setForm(prev => ({ ...prev, waba_id: event.target.value }))} />
                    <ValidatedFormInput label="Phone Number ID" value={form.phone_number_id} onChange={(event) => setForm(prev => ({ ...prev, phone_number_id: event.target.value }))} />
                </div>
                <ValidatedFormInput label="Twilio Account SID" value={form.twilio_account_sid} onChange={(event) => setForm(prev => ({ ...prev, twilio_account_sid: event.target.value }))} />
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                    <div className="mb-2 flex items-center gap-2 text-xs font-bold text-amber-800"><IconLock size={15} /> Credencial protegida</div>
                    <ValidatedFormInput
                        label={isEditing ? 'Nuevo token de acceso (opcional)' : 'Token de acceso *'}
                        type="password"
                        autoComplete="new-password"
                        value={form.access_token_cifrado}
                        onChange={(event) => setForm(prev => ({ ...prev, access_token_cifrado: event.target.value }))}
                        placeholder={isEditing ? 'Dejar vacío para conservar el actual' : 'Ingrese la credencial'}
                    />
                </div>
                <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-xs font-bold text-slate-500">Cancelar</button>
                    <button type="submit" disabled={loading} className="flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50">
                        {loading ? <IconLoader2 size={16} className="animate-spin" /> : <IconDeviceFloppy size={16} />} Guardar
                    </button>
                </div>
            </form>
        </Modal>
    );
}
