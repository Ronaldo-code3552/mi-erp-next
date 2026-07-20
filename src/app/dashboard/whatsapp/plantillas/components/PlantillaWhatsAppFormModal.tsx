"use client";

import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { toast } from 'sonner';
import { IconDeviceFloppy, IconLoader2 } from '@tabler/icons-react';
import Modal from '@/components/ui/Modal';
import ValidatedFormInput from '@/components/forms/ValidatedFormInput';
import SearchableSelect from '@/components/forms/SearchableSelect';
import { plantillaWhatsAppService } from '@/services/plantillaWhatsAppService';
import { CLIENTE_WHATSAPP_ID, getApiErrorMessage } from '@/lib/whatsappConfig';
import { CategoriaPlantillaWhatsApp, PlantillaWhatsApp } from '@/types';
import { CATEGORIA_PLANTILLA_WHATSAPP_OPTIONS } from '@/utils/selectOptions';

interface Props {
    isOpen: boolean;
    templateToEdit: PlantillaWhatsApp | null;
    onClose: () => void;
    onSuccess: () => void;
}

export default function PlantillaWhatsAppFormModal({ isOpen, templateToEdit, onClose, onSuccess }: Props) {
    const [form, setForm] = useState({ categoria: 'custom' as CategoriaPlantillaWhatsApp, nombre_interno: '', idioma: 'es', cuerpo_texto: '', es_default: false });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        setForm(templateToEdit ? {
            categoria: templateToEdit.categoria,
            nombre_interno: templateToEdit.nombre_interno,
            idioma: templateToEdit.idioma || 'es',
            cuerpo_texto: templateToEdit.cuerpo_texto,
            es_default: templateToEdit.es_default
        } : { categoria: 'custom', nombre_interno: '', idioma: 'es', cuerpo_texto: '', es_default: false });
    }, [isOpen, templateToEdit]);

    const submit = async (event: React.FormEvent) => {
        event.preventDefault();
        if (!form.nombre_interno.trim() || !form.cuerpo_texto.trim()) return toast.error('Nombre y cuerpo de la plantilla son obligatorios.');
        const bodyChanged = !!templateToEdit && form.cuerpo_texto.trim() !== templateToEdit.cuerpo_texto.trim();

        if (bodyChanged) {
            const confirm = await Swal.fire({
                title: 'La plantilla volverá a revisión',
                text: 'Al modificar el cuerpo, necesitará una nueva aprobación antes de poder usarse.',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonText: 'Guardar cambios',
                cancelButtonText: 'Cancelar',
                confirmButtonColor: '#d97706'
            });
            if (!confirm.isConfirmed) return;
        }

        setLoading(true);
        try {
            const response = templateToEdit
                ? await plantillaWhatsAppService.update(templateToEdit.plantillaWhatsappId, { nombre_interno: form.nombre_interno.trim(), cuerpo_texto: form.cuerpo_texto.trim() })
                : await plantillaWhatsAppService.create({ clienteWhatsappId: CLIENTE_WHATSAPP_ID, ...form, nombre_interno: form.nombre_interno.trim(), cuerpo_texto: form.cuerpo_texto.trim() });
            if (!response.isSuccess) return toast.error(response.message || 'No se pudo guardar la plantilla.');
            if (bodyChanged) toast.warning('Plantilla guardada. Ahora necesita una nueva aprobación.');
            else toast.success(templateToEdit ? 'Plantilla actualizada correctamente.' : 'Plantilla creada correctamente.');
            onSuccess();
            onClose();
        } catch (error) {
            toast.error(getApiErrorMessage(error, 'No se pudo guardar la plantilla.'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={templateToEdit ? 'Editar plantilla' : 'Nueva plantilla de WhatsApp'} size="lg">
            <form onSubmit={submit} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <SearchableSelect label="Categoría" value={form.categoria} options={[...CATEGORIA_PLANTILLA_WHATSAPP_OPTIONS]} onChange={(event) => setForm(prev => ({ ...prev, categoria: event.target.value as CategoriaPlantillaWhatsApp }))} disabled={!!templateToEdit} />
                    <ValidatedFormInput label="Idioma" value={form.idioma} onChange={(event) => setForm(prev => ({ ...prev, idioma: event.target.value }))} disabled={!!templateToEdit} placeholder="es" />
                </div>
                <ValidatedFormInput label="Nombre interno *" value={form.nombre_interno} onChange={(event) => setForm(prev => ({ ...prev, nombre_interno: event.target.value }))} />
                <div>
                    <label className="mb-1.5 block text-[10px] font-bold uppercase text-slate-500">Cuerpo del mensaje *</label>
                    <textarea rows={7} value={form.cuerpo_texto} onChange={(event) => setForm(prev => ({ ...prev, cuerpo_texto: event.target.value }))} className="w-full resize-none rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-emerald-500" placeholder="Hola {{1}}, tu pedido {{2}}..." />
                    <p className="mt-1 text-[10px] text-slate-400">Use placeholders como {'{{1}}'}, {'{{2}}'} cuando corresponda.</p>
                </div>
                {!templateToEdit && (
                    <label className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs font-bold text-slate-700">
                        Plantilla predeterminada <input type="checkbox" checked={form.es_default} onChange={(event) => setForm(prev => ({ ...prev, es_default: event.target.checked }))} className="h-4 w-4 accent-emerald-600" />
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
