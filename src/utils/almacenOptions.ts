// src/utils/almacenOptions.ts
import { SelectOption } from '@/types/catalog.types';

export type AlmacenOption = SelectOption & {
  // Los catálogos vienen enriquecidos por catalogService con `originalData`.
  originalData?: unknown;
  // Algunos catálogos también exponen `estado` directo (además de originalData.estado).
  estado?: unknown;
};

const isTruthyEstado = (estado: unknown): boolean =>
  estado === true || estado === 1 || estado === '1';

const getOriginalData = (opt: AlmacenOption): Record<string, unknown> => {
  const od = opt.originalData;
  return od && typeof od === 'object' ? (od as Record<string, unknown>) : {};
};

export const isAlmacenActivo = (opt: AlmacenOption): boolean => {
  const od = getOriginalData(opt);
  const estado = (od['estado'] as unknown) ?? opt.estado;
  return isTruthyEstado(estado);
};

export const getTipoAlmacenId = (opt: AlmacenOption): number => {
  const od = getOriginalData(opt);
  const tipoRaw =
    od['tipoalmacenId'] ??
    (typeof od['tipoAlmacen'] === 'object' && od['tipoAlmacen'] !== null
      ? (od['tipoAlmacen'] as Record<string, unknown>)['tipoAlmacenId']
      : undefined);

  const n = Number(String(tipoRaw ?? '').trim());
  return Number.isFinite(n) && n > 0 ? n : 9999;
};

export const getSedeId = (opt: AlmacenOption): string => {
  const od = getOriginalData(opt);
  const sedeRaw =
    od['sedeId'] ??
    (typeof od['sede'] === 'object' && od['sede'] !== null
      ? (od['sede'] as Record<string, unknown>)['sedeId']
      : undefined);
  return String(sedeRaw ?? '').trim();
};

export const sortAlmacenesByTipoPrioritario = (
  options: readonly AlmacenOption[],
  tipoPrioritario = 3
): AlmacenOption[] => {
  return [...options].sort((a, b) => {
    const tipoA = getTipoAlmacenId(a);
    const tipoB = getTipoAlmacenId(b);

    const prioA = tipoA === tipoPrioritario ? 0 : 1;
    const prioB = tipoB === tipoPrioritario ? 0 : 1;
    if (prioA !== prioB) return prioA - prioB;

    if (tipoA !== tipoB) return tipoA - tipoB;

    const labelA = String(a.label || '').trim().toUpperCase();
    const labelB = String(b.label || '').trim().toUpperCase();
    return labelA.localeCompare(labelB);
  });
};

export const getAlmacenesActivosOrdenados = (
  options: readonly AlmacenOption[],
  tipoPrioritario = 3
): AlmacenOption[] => {
  return sortAlmacenesByTipoPrioritario(options.filter(isAlmacenActivo), tipoPrioritario);
};

export const withTodosAlmacenesOption = (
  options: readonly AlmacenOption[],
  label = '-- TODOS LOS ALMACENES --'
): AlmacenOption[] => {
  return [
    { value: '', label, key: 'ALL', originalData: {} },
    ...options,
  ];
};

