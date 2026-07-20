// src/utils/selectOptions.ts
// Helpers reutilizables para listas de opciones (SearchableSelect, MultiSelect, etc.)

export type BasicSelectOption = {
    value?: unknown;
    label?: unknown;
    aux?: unknown;
    key?: unknown;
    originalData?: unknown;
    raw?: unknown;
};

const normalizeOptId = (opt: BasicSelectOption) => {
    const v = (opt?.value ?? opt?.key) as unknown;
    return String(v ?? '').trim();
};

/**
 * Upsert de una opción por `value` (o `key` si no existe `value`).
 * Útil cuando se crea/edita un registro y queremos que aparezca en el DDL sin recargar la página.
 */
export function upsertOptionByValue<T extends BasicSelectOption>(
    prev: T[],
    next: T,
    opts?: { prepend?: boolean }
): T[] {
    const id = normalizeOptId(next);
    if (!id) return prev;

    const idx = prev.findIndex((o) => normalizeOptId(o) === id);
    if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], ...next };
        return copy;
    }

    return opts?.prepend ? [next, ...prev] : [...prev, next];
}

export const PROVEEDOR_WHATSAPP_OPTIONS = [
    { value: 'meta_whatsapp', label: 'META WHATSAPP' },
    { value: 'twilio_whatsapp', label: 'TWILIO WHATSAPP' },
    { value: 'twilio_sms', label: 'TWILIO SMS' }
] as const;

export const ESTADO_SENDER_WHATSAPP_OPTIONS = [
    { value: 'pendiente', label: 'PENDIENTE' },
    { value: 'verificado', label: 'VERIFICADO' },
    { value: 'activo', label: 'ACTIVO' },
    { value: 'suspendido', label: 'SUSPENDIDO' }
] as const;

export const CATEGORIA_PLANTILLA_WHATSAPP_OPTIONS = [
    { value: 'order_notification', label: 'NOTIFICACIÓN DE PEDIDO' },
    { value: 'appointment_reminder', label: 'RECORDATORIO DE CITA' },
    { value: 'verification_code', label: 'CÓDIGO DE VERIFICACIÓN' },
    { value: 'custom', label: 'PERSONALIZADA' }
] as const;

export const ESTADO_APROBACION_PLANTILLA_OPTIONS = [
    { value: 'borrador', label: 'BORRADOR' },
    { value: 'en_revision', label: 'EN REVISIÓN' },
    { value: 'aprobado', label: 'APROBADO' },
    { value: 'rechazado', label: 'RECHAZADO' }
] as const;

export const ESTADO_CONVERSACION_WHATSAPP_OPTIONS = [
    { value: 'abierta', label: 'ABIERTA' },
    { value: 'cerrada', label: 'CERRADA' }
] as const;

export const INICIADA_POR_WHATSAPP_OPTIONS = [
    { value: 'negocio', label: 'NEGOCIO' },
    { value: 'usuario', label: 'USUARIO' }
] as const;

export const DIRECCION_MENSAJE_WHATSAPP_OPTIONS = [
    { value: 'saliente', label: 'SALIENTE' },
    { value: 'entrante', label: 'ENTRANTE' }
] as const;

export const TIPO_MENSAJE_WHATSAPP_OPTIONS = [
    { value: 'plantilla', label: 'PLANTILLA' },
    { value: 'texto_libre', label: 'TEXTO LIBRE' },
    { value: 'media', label: 'MULTIMEDIA' }
] as const;

export const ESTADO_MENSAJE_WHATSAPP_OPTIONS = [
    { value: 'encolado', label: 'ENCOLADO' },
    { value: 'enviado', label: 'ENVIADO' },
    { value: 'entregado', label: 'ENTREGADO' },
    { value: 'leido', label: 'LEÍDO' },
    { value: 'fallido', label: 'FALLIDO' },
    { value: 'recibido', label: 'RECIBIDO' }
] as const;
