"use client";

import Modal from "@/components/ui/Modal";
import DocumentoAdjuntosPanel from "@/components/documentos/DocumentoAdjuntosPanel";
import { DocumentoPdfReferenciaTabla } from "@/types/documentoPdf.types";

interface DocumentoAdjuntosViewerModalProps {
    isOpen: boolean;
    onClose: () => void;
    referenciaId: string;
    referenciaTabla: DocumentoPdfReferenciaTabla;
    title?: string;
}

const EMPTY_PENDING_FILES: File[] = [];
const ignorePendingFiles = () => undefined;

export default function DocumentoAdjuntosViewerModal({
    isOpen,
    onClose,
    referenciaId,
    referenciaTabla,
    title = "Archivos adjuntos"
}: DocumentoAdjuntosViewerModalProps) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} size="lg">
            <DocumentoAdjuntosPanel
                referenciaId={referenciaId || undefined}
                referenciaTabla={referenciaTabla}
                readOnly
                archivosPendientes={EMPTY_PENDING_FILES}
                onArchivosPendientesChange={ignorePendingFiles}
            />
        </Modal>
    );
}
