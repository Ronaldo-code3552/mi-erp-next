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

