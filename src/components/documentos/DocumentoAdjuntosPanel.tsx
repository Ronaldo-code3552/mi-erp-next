"use client";

import { ChangeEvent, useCallback, useEffect, useRef, useState } from "react";
import {
    IconAlertCircle,
    IconDownload,
    IconEye,
    IconFile,
    IconLoader,
    IconPaperclip,
    IconTrash,
    IconX
} from "@tabler/icons-react";
import Swal from "sweetalert2";
import { toast } from "sonner";

import Modal from "@/components/ui/Modal";
import { documentoPdfService } from "@/services/documentoPdfService";
import {
    DocumentoPdfMetadata,
    DocumentoPdfReferenciaTabla
} from "@/types/documentoPdf.types";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_FILE_TYPES = new Set([
    "application/pdf",
    "image/jpeg",
    "image/png"
]);
const ACCEPTED_EXTENSIONS = new Set([".pdf", ".jpg", ".jpeg", ".png"]);
const INPUT_ACCEPT = ".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png";

interface DocumentoAdjuntosPanelProps {
    referenciaId?: string;
    referenciaTabla: DocumentoPdfReferenciaTabla;
    readOnly?: boolean;
    disabled?: boolean;
    compact?: boolean;
    refreshKey?: number;
    archivosPendientes: File[];
    onArchivosPendientesChange: (files: File[]) => void;
}

const extensionOf = (fileName: string) => {
    const dotIndex = fileName.lastIndexOf(".");
    return dotIndex >= 0 ? fileName.slice(dotIndex).toLowerCase() : "";
};

const pendingFileKey = (file: File) => `${file.name}|${file.size}|${file.lastModified}`;

const validateFile = (file: File, existingKeys: Set<string>) => {
    if (file.size <= 0) return "El archivo está vacío.";
    if (!ACCEPTED_FILE_TYPES.has(file.type.toLowerCase())) {
        return "El tipo de archivo no está permitido.";
    }
    if (!ACCEPTED_EXTENSIONS.has(extensionOf(file.name))) {
        return "La extensión del archivo no está permitida.";
    }
    if (file.size > MAX_FILE_SIZE) return "El archivo supera el máximo de 10 MB.";
    if (existingKeys.has(pendingFileKey(file))) {
        return "El archivo ya está pendiente de carga.";
    }
    return "";
};

const formatBytes = (bytes: number) => {
    if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
    if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
};

const formatDate = (value: string) => {
    if (!value) return "Sin fecha";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return new Intl.DateTimeFormat("es-PE", {
        dateStyle: "short",
        timeStyle: "short"
    }).format(date);
};

const contentTypeLabel = (contentType: string) => {
    if (contentType === "application/pdf") return "PDF";
    if (contentType === "image/png") return "PNG";
    return "JPG";
};

const errorMessage = (error: unknown, fallback: string) => (
    error instanceof Error && error.message ? error.message : fallback
);

export default function DocumentoAdjuntosPanel({
    referenciaId,
    referenciaTabla,
    readOnly = false,
    disabled = false,
    compact = false,
    refreshKey = 0,
    archivosPendientes,
    onArchivosPendientesChange
}: DocumentoAdjuntosPanelProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const [archivosExistentes, setArchivosExistentes] = useState<DocumentoPdfMetadata[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState("");
    const [viewingId, setViewingId] = useState<number | null>(null);
    const [downloadingId, setDownloadingId] = useState<number | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [modalOpen, setModalOpen] = useState(false);
    const interactionsDisabled = readOnly || disabled;

    const loadExistingFiles = useCallback(async (signal?: AbortSignal) => {
        if (!referenciaId) {
            setArchivosExistentes([]);
            setLoadError("");
            setLoading(false);
            return;
        }

        setLoading(true);
        setLoadError("");
        const response = await documentoPdfService.getByReference(
            referenciaTabla,
            referenciaId,
            signal
        );

        if (signal?.aborted) return;

        if (!response.isSuccess) {
            setArchivosExistentes([]);
            setLoadError(response.message || "No se pudieron cargar los archivos.");
        } else {
            setArchivosExistentes(response.data || []);
        }
        setLoading(false);
    }, [referenciaId, referenciaTabla]);

    useEffect(() => {
        const controller = new AbortController();
        void loadExistingFiles(controller.signal);
        return () => controller.abort();
    }, [loadExistingFiles, refreshKey]);

    const selectFiles = (event: ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = Array.from(event.currentTarget.files || []);
        const acceptedFiles: File[] = [];
        const existingKeys = new Set(archivosPendientes.map(pendingFileKey));
        const errors: string[] = [];

        for (const file of selectedFiles) {
            const validationError = validateFile(file, existingKeys);
            if (validationError) {
                errors.push(`${file.name}: ${validationError}`);
                continue;
            }

            acceptedFiles.push(file);
            existingKeys.add(pendingFileKey(file));
        }

        if (acceptedFiles.length > 0) {
            onArchivosPendientesChange([...archivosPendientes, ...acceptedFiles]);
        }
        if (errors.length > 0) toast.error(errors.join("\n"));
        event.currentTarget.value = "";
    };

    const removePending = (fileToRemove: File) => {
        const keyToRemove = pendingFileKey(fileToRemove);
        onArchivosPendientesChange(
            archivosPendientes.filter(file => pendingFileKey(file) !== keyToRemove)
        );
        if (inputRef.current) inputRef.current.value = "";
    };

    const previewFile = async (file: DocumentoPdfMetadata) => {
        setViewingId(file.id);
        try {
            await documentoPdfService.openOrPreview(file.id);
        } catch (error: unknown) {
            toast.error(errorMessage(error, "No se pudo visualizar el archivo."));
        } finally {
            setViewingId(null);
        }
    };

    const downloadFile = async (file: DocumentoPdfMetadata) => {
        setDownloadingId(file.id);
        try {
            await documentoPdfService.download(file.id, file.nombreArchivo);
        } catch (error: unknown) {
            toast.error(errorMessage(error, "No se pudo descargar el archivo."));
        } finally {
            setDownloadingId(null);
        }
    };

    const deleteFile = async (file: DocumentoPdfMetadata) => {
        if (!referenciaId) return;

        const confirmation = await Swal.fire({
            title: "¿Eliminar archivo?",
            text: `Se eliminará permanentemente ${file.nombreArchivo}.`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonText: "Sí, eliminar",
            cancelButtonText: "Cancelar",
            confirmButtonColor: "#ef4444"
        });

        if (!confirmation.isConfirmed) return;

        setDeletingId(file.id);
        const response = await documentoPdfService.delete({
            id: file.id,
            referenciaId,
            referenciaTabla
        });
        setDeletingId(null);

        if (!response.isSuccess) {
            toast.error(response.message || "No se pudo eliminar el archivo.");
            return;
        }

        toast.success("Archivo eliminado correctamente.");
        await loadExistingFiles();
    };

    const panel = (
        <section className="rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
                <div className="flex min-w-0 items-center gap-2">
                    <IconPaperclip size={18} className="shrink-0 text-blue-600" />
                    <h2 className="text-sm font-bold uppercase text-slate-800">Archivos adjuntos</h2>
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                        {archivosExistentes.length} guardado(s)
                    </span>
                    {archivosPendientes.length > 0 && (
                        <span className="rounded bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                            {archivosPendientes.length} pendiente(s)
                        </span>
                    )}
                </div>

                {!readOnly && (
                    <>
                        <input
                            ref={inputRef}
                            type="file"
                            multiple
                            accept={INPUT_ACCEPT}
                            disabled={interactionsDisabled}
                            onChange={selectFiles}
                            className="hidden"
                        />
                        <button
                            type="button"
                            disabled={interactionsDisabled}
                            onClick={() => inputRef.current?.click()}
                            className="inline-flex h-9 items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 text-xs font-bold text-blue-700 hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            {disabled ? <IconLoader className="animate-spin" size={16} /> : <IconPaperclip size={16} />}
                            Seleccionar archivos
                        </button>
                    </>
                )}
            </div>

            <div className="divide-y divide-slate-100">
                {loading && (
                    <div className="flex items-center justify-center gap-2 px-4 py-8 text-xs font-semibold text-slate-400">
                        <IconLoader className="animate-spin" size={18} />
                        Cargando archivos...
                    </div>
                )}

                {!loading && loadError && (
                    <div className="flex items-center gap-2 bg-red-50 px-4 py-3 text-xs font-semibold text-red-600">
                        <IconAlertCircle size={17} />
                        {loadError}
                    </div>
                )}

                {!loading && archivosExistentes.map(file => (
                    <div
                        key={`saved-${file.id}`}
                        className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3"
                    >
                        <div className="flex min-w-0 items-center gap-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                                <IconFile size={18} />
                            </span>
                            <div className="min-w-0">
                                <p className="truncate text-xs font-bold text-slate-700">{file.nombreArchivo}</p>
                                <p className="mt-1 text-[10px] text-slate-400">
                                    {contentTypeLabel(file.tipoContenido)} · {formatBytes(file.tamanioBytes)} · {formatDate(file.fechaRegistro)}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                title="Visualizar"
                                disabled={viewingId === file.id}
                                onClick={() => void previewFile(file)}
                                className="rounded-lg p-2 text-slate-400 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-50"
                            >
                                {viewingId === file.id
                                    ? <IconLoader className="animate-spin" size={17} />
                                    : <IconEye size={17} />}
                            </button>
                            <button
                                type="button"
                                title="Descargar"
                                disabled={downloadingId === file.id}
                                onClick={() => void downloadFile(file)}
                                className="rounded-lg p-2 text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 disabled:opacity-50"
                            >
                                {downloadingId === file.id
                                    ? <IconLoader className="animate-spin" size={17} />
                                    : <IconDownload size={17} />}
                            </button>
                            {!readOnly && (
                                <button
                                    type="button"
                                    title="Eliminar"
                                    disabled={disabled || deletingId === file.id}
                                    onClick={() => void deleteFile(file)}
                                    className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                                >
                                    {deletingId === file.id
                                        ? <IconLoader className="animate-spin" size={17} />
                                        : <IconTrash size={17} />}
                                </button>
                            )}
                        </div>
                    </div>
                ))}

                {archivosPendientes.map(file => (
                    <div
                        key={`pending-${pendingFileKey(file)}`}
                        className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 bg-amber-50/40 px-4 py-3"
                    >
                        <div className="flex min-w-0 items-center gap-3">
                            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                                {disabled ? <IconLoader className="animate-spin" size={18} /> : <IconFile size={18} />}
                            </span>
                            <div className="min-w-0">
                                <p className="truncate text-xs font-bold text-slate-700">{file.name}</p>
                                <p className="mt-1 text-[10px] font-semibold text-amber-700">
                                    {contentTypeLabel(file.type)} · {formatBytes(file.size)} · {disabled ? "Subiendo" : "Pendiente de guardar"}
                                </p>
                            </div>
                        </div>
                        {!readOnly && (
                            <button
                                type="button"
                                title="Quitar archivo pendiente"
                                disabled={disabled}
                                onClick={() => removePending(file)}
                                className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                            >
                                <IconX size={17} />
                            </button>
                        )}
                    </div>
                ))}

                {!loading
                    && !loadError
                    && archivosExistentes.length === 0
                    && archivosPendientes.length === 0
                    && (
                        <div className="px-4 py-8 text-center text-xs italic text-slate-400">
                            No existen archivos adjuntos.
                        </div>
                    )}
            </div>
        </section>
    );

    if (!compact) return panel;

    const totalFiles = archivosExistentes.length + archivosPendientes.length;
    const summary = loading
        ? "Consultando archivos..."
        : totalFiles === 0
            ? "Sin archivos"
            : `${totalFiles} archivo(s)`;

    return (
        <div className="flex min-w-0 flex-col gap-1.5">
            <label className="text-[10px] font-bold uppercase text-slate-500">
                Archivos adjuntos
            </label>
            <button
                type="button"
                disabled={disabled}
                onClick={() => setModalOpen(true)}
                className={`flex h-[38px] min-w-0 items-center justify-between gap-2 rounded-lg border px-3 text-xs transition-colors ${
                    disabled
                        ? "cursor-wait border-slate-200 bg-slate-100 text-slate-500"
                        : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50"
                }`}
                title={readOnly ? "Ver archivos adjuntos" : "Adjuntar o administrar archivos"}
            >
                <span className="flex min-w-0 items-center gap-2">
                    {loading || disabled
                        ? <IconLoader className="shrink-0 animate-spin text-blue-600" size={16} />
                        : <IconPaperclip className="shrink-0 text-blue-600" size={16} />}
                    <span className="truncate font-semibold">{summary}</span>
                </span>
                <IconEye className="shrink-0 text-slate-400" size={16} />
            </button>

            <Modal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                title="Archivos adjuntos"
                size="lg"
            >
                {panel}
            </Modal>
        </div>
    );
}
