import apiClient from "@/api/apiCliente";
import { ApiResponse } from "@/types";
import {
    MotivoNcNdElectronico,
    TipoDocumentoNota,
    TIPO_DOCUMENTO_NOTA
} from "@/types/motivoNcNdElectronico.types";

const BASE_URL = "/MotivosNcNdElectronico";
const PAGE_NUMBER = 1;
const PAGE_SIZE = 200;

type UnknownRecord = Record<string, unknown>;

const recordOf = (value: unknown): UnknownRecord => (
    typeof value === "object" && value !== null
        ? value as UnknownRecord
        : {}
);

const firstString = (source: UnknownRecord, keys: string[]) => {
    for (const key of keys) {
        const value = source[key];
        if (value !== null && value !== undefined && String(value).trim()) {
            return String(value).trim();
        }
    }

    return "";
};

const normalizeTipoDocumento = (
    value: unknown,
    fallback?: TipoDocumentoNota
): TipoDocumentoNota | null => {
    const normalized = String(value || fallback || "").trim().toUpperCase();
    if (normalized === TIPO_DOCUMENTO_NOTA.NC) return TIPO_DOCUMENTO_NOTA.NC;
    if (normalized === TIPO_DOCUMENTO_NOTA.ND) return TIPO_DOCUMENTO_NOTA.ND;
    return null;
};

const normalizeMotivo = (
    value: unknown,
    fallbackTipoDocumento?: TipoDocumentoNota
): MotivoNcNdElectronico | null => {
    const raw = recordOf(value);
    const motivoElectronicoId = firstString(raw, [
        "motivoElectronicoId",
        "motivoelectronicoId",
        "MotivoElectronicoId"
    ]);
    const tipoDocumento = normalizeTipoDocumento(
        raw.tipoDocumento ?? raw.tipodocumento ?? raw.TipoDocumento,
        fallbackTipoDocumento
    );

    if (!motivoElectronicoId || !tipoDocumento) return null;

    return {
        motivoElectronicoId,
        tipoDocumento,
        concepto: firstString(raw, ["concepto", "Concepto"])
    };
};

const getErrorMessage = (error: unknown, fallback: string) => {
    const response = recordOf(recordOf(error).response);
    const data = recordOf(response.data);
    return firstString(data, ["message", "Message"])
        || (error instanceof Error && error.message ? error.message : fallback);
};

const responseMessage = (payload: UnknownRecord) => (
    firstString(payload, ["message", "Message"]) || undefined
);

const responseSuccess = (payload: UnknownRecord, fallback: boolean) => {
    const value = payload.isSuccess ?? payload.IsSuccess;
    return typeof value === "boolean" ? value : fallback;
};

const normalizeMeta = (payload: UnknownRecord) => {
    const meta = recordOf(payload.meta ?? payload.Meta);
    return {
        totalRecords: Number(meta.totalRecords ?? meta.TotalRecords ?? 0),
        totalPages: Number(meta.totalPages ?? meta.TotalPages ?? 1),
        currentPage: Number(meta.currentPage ?? meta.CurrentPage ?? PAGE_NUMBER),
        pageSize: Number(meta.pageSize ?? meta.PageSize ?? PAGE_SIZE)
    };
};

export const motivoNcNdElectronicoService = {
    getAll: async (
        tipoDocumento: TipoDocumentoNota,
        searchTerm = ""
    ): Promise<ApiResponse<MotivoNcNdElectronico[]>> => {
        try {
            const normalizedSearch = searchTerm.trim();
            const response = await apiClient.get(BASE_URL, {
                params: {
                    PageNumber: PAGE_NUMBER,
                    PageSize: PAGE_SIZE,
                    SearchTerm: normalizedSearch || undefined,
                    TipoDocumento: tipoDocumento
                }
            });
            const payload = recordOf(response.data);
            const dataValue = payload.data ?? payload.Data;
            const rows = Array.isArray(dataValue)
                ? dataValue
                : Array.isArray(response.data) ? response.data : [];
            const data = rows
                .map(item => normalizeMotivo(item, tipoDocumento))
                .filter((item): item is MotivoNcNdElectronico => (
                    item !== null && item.tipoDocumento === tipoDocumento
                ));

            return {
                isSuccess: responseSuccess(payload, true),
                data,
                meta: normalizeMeta(payload),
                message: responseMessage(payload)
            };
        } catch (error) {
            return {
                isSuccess: false,
                data: [],
                message: getErrorMessage(error, "No se pudieron obtener los motivos electrónicos.")
            };
        }
    },

    getById: async (
        motivoElectronicoId: string
    ): Promise<ApiResponse<MotivoNcNdElectronico | null>> => {
        try {
            const response = await apiClient.get(
                `${BASE_URL}/${encodeURIComponent(motivoElectronicoId.trim())}`
            );
            const payload = recordOf(response.data);
            const dataValue = payload.data ?? payload.Data ?? response.data;
            const data = normalizeMotivo(dataValue);

            return {
                isSuccess: responseSuccess(payload, data !== null),
                data,
                message: responseMessage(payload)
            };
        } catch (error) {
            return {
                isSuccess: false,
                data: null,
                message: getErrorMessage(error, "No se pudo obtener el motivo electrónico.")
            };
        }
    }
};
