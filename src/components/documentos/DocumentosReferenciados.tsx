"use client";

import { useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
    IconEye,
    IconFileInvoice,
    IconFileMinus,
    IconFilePlus,
    IconLoader,
    IconPackageImport,
    IconShoppingCart,
    IconTruck
} from "@tabler/icons-react";

import type { ReferenciaDocumentoModule } from "@/types/referenciasUso.types";
import {
    normalizeReferenciasUso,
    parseReferenceTrail,
    REFERENCED_DOCUMENT_MAX_DEPTH,
    resolveReferencedDocumentPath
} from "@/utils/referenciasUso";

interface DocumentosReferenciadosProps {
    referenciasUso: unknown;
    currentModule: ReferenciaDocumentoModule;
    currentId: string;
}

const iconByModule = {
    DOCUMENTO_COMPRA: IconFileInvoice,
    NOTA_CREDITO: IconFileMinus,
    NOTA_DEBITO: IconFilePlus,
    NOTA_INGRESO: IconPackageImport,
    GUIA_REMISION: IconTruck,
    ORDEN_COMPRA_SERVICIO: IconShoppingCart
} satisfies Record<ReferenciaDocumentoModule, typeof IconFileInvoice>;

const groupTitleByModule: Record<ReferenciaDocumentoModule, string> = {
    DOCUMENTO_COMPRA: "Documentos de compra",
    NOTA_CREDITO: "Notas de crédito",
    NOTA_DEBITO: "Notas de débito",
    NOTA_INGRESO: "Notas de ingreso",
    GUIA_REMISION: "Guías de remisión",
    ORDEN_COMPRA_SERVICIO: "Órdenes de compra/servicio"
};

const formatDate = (value?: string) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";

    return new Intl.DateTimeFormat("es-PE", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    }).format(date);
};

const statusClass = (status?: string) => {
    const normalized = String(status || "").trim().toUpperCase();
    if (normalized === "ANULADO") return "border-red-200 bg-red-50 text-red-700";
    if (normalized === "APROBADO") return "border-emerald-200 bg-emerald-50 text-emerald-700";
    if (normalized === "COMPROMETIDO") return "border-amber-200 bg-amber-50 text-amber-700";
    return "border-slate-200 bg-slate-50 text-slate-600";
};

export default function DocumentosReferenciados({
    referenciasUso,
    currentModule,
    currentId
}: DocumentosReferenciadosProps) {
    const router = useRouter();
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [loadingKey, setLoadingKey] = useState<string | null>(null);
    const navigationLock = useRef(false);

    const references = useMemo(
        () => normalizeReferenciasUso(referenciasUso),
        [referenciasUso]
    );

    const groups = useMemo(() => {
        const result = new Map<
            ReferenciaDocumentoModule,
            typeof references
        >();

        references.forEach(reference => {
            const current = result.get(reference.module) || [];
            result.set(reference.module, [...current, reference]);
        });

        return Array.from(result.entries());
    }, [references]);

    if (references.length === 0) return null;

    const currentKey = `${currentModule}:${currentId}`;
    const inheritedTrail = parseReferenceTrail(searchParams.get("trail"));
    const activeTrail = inheritedTrail.includes(currentKey)
        ? inheritedTrail
        : [...inheritedTrail, currentKey].slice(0, REFERENCED_DOCUMENT_MAX_DEPTH);
    const currentQuery = searchParams.toString();
    const currentHref = `${pathname}${currentQuery ? `?${currentQuery}` : ""}`;
    const reachedDepthLimit = activeTrail.length >= REFERENCED_DOCUMENT_MAX_DEPTH;

    const openReference = (reference: (typeof references)[number]) => {
        if (
            navigationLock.current
            || loadingKey
            || reachedDepthLimit
            || activeTrail.includes(reference.navigationKey)
        ) {
            return;
        }

        navigationLock.current = true;
        setLoadingKey(reference.key);
        const destination = new URLSearchParams();
        destination.set("mode", "view");
        destination.set("returnTo", currentHref);
        destination.set("trail", activeTrail.join("|"));

        router.push(
            `${resolveReferencedDocumentPath(reference)}?${destination.toString()}`
        );
    };

    return (
        <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-2">
                <div className="flex items-center gap-2">
                    <IconFileInvoice size={19} className="text-cyan-700" />
                    <h2 className="text-sm font-bold uppercase text-slate-800">
                        Documentos referenciados
                    </h2>
                </div>
                <span className="text-xs font-bold text-slate-400">
                    {references.length} documento(s)
                </span>
            </div>

            <div className="space-y-4">
                {groups.map(([module, items]) => (
                    <div key={module}>
                        <p className="mb-2 text-[10px] font-black uppercase text-slate-500">
                            {groupTitleByModule[module]} ({items.length})
                        </p>
                        <div className="grid gap-2 lg:grid-cols-2">
                            {items.map(reference => {
                                const Icon = iconByModule[reference.module];
                                const isLoading = loadingKey === reference.key;
                                const isCycle = activeTrail.includes(reference.navigationKey);
                                const disabled = Boolean(loadingKey)
                                    || isCycle
                                    || reachedDepthLimit;
                                const formattedDate = formatDate(reference.date);

                                return (
                                    <div
                                        key={reference.key}
                                        className="flex min-w-0 items-center gap-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3"
                                    >
                                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-cyan-700 shadow-sm">
                                            <Icon size={19} />
                                        </span>
                                        <div className="min-w-0 flex-1">
                                            <p className="truncate text-xs font-black text-slate-800">
                                                {reference.title}
                                            </p>
                                            <p className="truncate font-mono text-[11px] font-bold text-slate-600">
                                                {reference.displayNumber || reference.id}
                                            </p>
                                            <div className="mt-1 flex flex-wrap items-center gap-2">
                                                {reference.status && (
                                                    <span className={`rounded border px-1.5 py-0.5 text-[9px] font-black uppercase ${statusClass(reference.status)}`}>
                                                        {reference.status}
                                                    </span>
                                                )}
                                                {formattedDate && (
                                                    <span className="text-[10px] font-medium text-slate-500">
                                                        {formattedDate}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => openReference(reference)}
                                            disabled={disabled}
                                            title={isCycle
                                                ? "Este documento ya está abierto en la navegación actual"
                                                : reachedDepthLimit
                                                    ? "Se alcanzó el límite de navegación"
                                                    : `Ver detalle de ${reference.title.toLowerCase()}`}
                                            className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-cyan-200 bg-white px-3 text-[10px] font-black uppercase text-cyan-700 transition-colors hover:bg-cyan-50 disabled:cursor-not-allowed disabled:opacity-45"
                                        >
                                            {isLoading
                                                ? <IconLoader size={15} className="animate-spin" />
                                                : <IconEye size={15} />}
                                            <span className="hidden sm:inline">
                                                {isLoading ? "Cargando..." : "Ver detalle"}
                                            </span>
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
