export interface FileDownloadResult {
    blob: Blob;
    fileName?: string;
    contentType?: string;
}

type ErrorResponseLike = {
    response?: {
        data?: unknown;
    };
};

const asRecord = (value: unknown): Record<string, unknown> | null => (
    typeof value === "object" && value !== null
        ? value as Record<string, unknown>
        : null
);

const messageFromValue = (value: unknown): string | undefined => {
    if (typeof value === "string" && value.trim()) return value.trim();

    const record = asRecord(value);
    if (!record) return undefined;

    const directMessage = record.message ?? record.Message;
    if (typeof directMessage === "string" && directMessage.trim()) {
        return directMessage.trim();
    }

    return messageFromValue(record.error) || messageFromValue(record.data);
};

const decodeFileName = (value: string) => {
    const cleanValue = value.trim().replace(/^["']|["']$/g, "");

    try {
        return decodeURIComponent(cleanValue);
    } catch {
        return cleanValue;
    }
};

export const getFileNameFromContentDisposition = (
    disposition?: string | null
): string | undefined => {
    if (!disposition) return undefined;

    const utf8Match = disposition.match(/filename\*\s*=\s*(?:UTF-8'')?([^;]+)/i);
    if (utf8Match?.[1]) return decodeFileName(utf8Match[1]);

    const filenameMatch = disposition.match(/filename\s*=\s*(?:"([^"]+)"|([^;]+))/i);
    const fileName = filenameMatch?.[1] || filenameMatch?.[2];

    return fileName ? decodeFileName(fileName) : undefined;
};

export const buildTimestampedFileName = (
    prefix: string,
    extension: string,
    date = new Date()
) => {
    const pad = (value: number) => String(value).padStart(2, "0");
    const timestamp = [
        date.getFullYear(),
        pad(date.getMonth() + 1),
        pad(date.getDate())
    ].join("") + "_" + [
        pad(date.getHours()),
        pad(date.getMinutes()),
        pad(date.getSeconds())
    ].join("");

    return `${prefix}_${timestamp}.${extension.replace(/^\./, "")}`;
};

export const downloadBlob = (blob: Blob, fileName: string) => {
    const objectUrl = window.URL.createObjectURL(blob);
    const link = document.createElement("a");

    try {
        link.href = objectUrl;
        link.download = fileName;
        link.style.display = "none";
        document.body.appendChild(link);
        link.click();
    } finally {
        link.remove();
        window.URL.revokeObjectURL(objectUrl);
    }
};

export const getDownloadErrorMessage = async (
    error: unknown,
    fallback: string
): Promise<string> => {
    const responseData = asRecord(error) &&
        (error as ErrorResponseLike).response?.data;

    if (typeof Blob !== "undefined" && responseData instanceof Blob) {
        try {
            const text = (await responseData.text()).trim();
            if (!text) return fallback;

            try {
                return messageFromValue(JSON.parse(text)) || text;
            } catch {
                return text;
            }
        } catch {
            return fallback;
        }
    }

    return messageFromValue(responseData)
        || messageFromValue(error)
        || (error instanceof Error && error.message ? error.message : fallback);
};
