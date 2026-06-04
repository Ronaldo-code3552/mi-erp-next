// src/components/forms/SearchableSelect.tsx
"use client";
import { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';
import { IconChevronDown, IconSearch, IconCheck, IconLoader } from '@tabler/icons-react';
import { catalogService } from '@/services/catalogService';

interface Option {
    key?: string | number;
    value: string | number; 
    label?: string;         
    aux?: string | number;
    descripcion?: string;
    nombre?: string;
    numero_doc?: string | number;
    originalData?: Record<string, unknown>;
    raw?: unknown;
}

type SelectChangeEvent = {
    target: {
        name?: string;
        value: string | number;
    };
    option?: Option;
}

interface Props {
    label?: string;
    name?: string;
    value: string | number;
    onChange: (e: SelectChangeEvent) => void;
    options?: Option[];           
    endpoint?: string;            // Para Catálogos genéricos (ej: 'TipoDocumentoComercial')
    fetchCustom?: (term: string, params?: Record<string, unknown>) => Promise<Option[]>;
    fetchParams?: Record<string, unknown>; 
    fallbackLabel?: string;       
    disabled?: boolean;
    placeholder?: string;
    searchDebounceMs?: number;
}

export default function SearchableSelect({
    label, name, value, onChange, options = [], endpoint, fetchCustom, fetchParams,
    fallbackLabel, disabled, placeholder = "-- Seleccione --", searchDebounceMs = 400
}: Props) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const containerRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const latestFetchCustomRef = useRef<Props['fetchCustom']>(fetchCustom);
    const latestFetchParamsRef = useRef<Props['fetchParams']>(fetchParams);
    const positionFrameRef = useRef<number | null>(null);
    const [dropdownStyle, setDropdownStyle] = useState<CSSProperties>({ visibility: 'hidden' });
    
    const [asyncOptions, setAsyncOptions] = useState<Option[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    
    // Es asíncrono si tiene endpoint O si tiene función fetchCustom
    const isAsync = !!endpoint || !!fetchCustom;
    const fetchParamsKey = useMemo(() => JSON.stringify(fetchParams || {}), [fetchParams]);

    useEffect(() => {
        latestFetchCustomRef.current = fetchCustom;
    }, [fetchCustom]);

    useEffect(() => {
        latestFetchParamsRef.current = fetchParams;
    }, [fetchParams]);

    // 🚀 EFECTO DE BÚSQUEDA ASÍNCRONA ACTUALIZADO
    useEffect(() => {
        if (!isAsync || !isOpen) return; // Solo buscamos si está abierto

        const fetchAsync = async () => {
            setIsLoading(true);
            try {
                let res: Option[] = [];
                const currentFetchCustom = latestFetchCustomRef.current;
                const currentFetchParams = latestFetchParamsRef.current;

                if (currentFetchCustom) {
                    // 🚀 CASO A: Usa el servicio especializado (Ej: productoService)
                    res = await currentFetchCustom(searchTerm, currentFetchParams);
                } else if (endpoint) {
                    // 🚀 CASO B: Usa el catálogo genérico
                    const rawRes = await catalogService.getDynamicCatalog(endpoint, {
                        ...currentFetchParams,
                        search: searchTerm // Mantiene la lógica antigua para catálogos
                    });
                    res = rawRes as Option[];
                }

                setAsyncOptions(res);
            } catch (error) {
                console.error("Error en SearchableSelect Async:", error);
            } finally {
                setIsLoading(false);
            }
        };

        const timer = window.setTimeout(fetchAsync, searchDebounceMs);
        return () => window.clearTimeout(timer);
    }, [endpoint, fetchParamsKey, searchTerm, isAsync, searchDebounceMs, isOpen]);

    // Extracción de Labels
    const getOptionLabel = (opt: Option) =>
        opt.label ?? opt.descripcion ?? opt.nombre ?? (typeof opt.aux === 'string' ? opt.aux : undefined) ?? opt.value;
    const getOptionId = (opt: Option) => (opt.label !== undefined ? opt.value : (opt.key ?? opt.value));

    // Qué opciones mostramos
    const activeOptions = isAsync ? asyncOptions : options;

    // Filtro Local (Solo si NO es asíncrono)
    const filteredOptions = isAsync ? activeOptions : (activeOptions?.filter(opt => {
        const term = searchTerm.toLowerCase().trim();
        if (!term) return true;
        const searchableText = [getOptionLabel(opt), opt.aux, getOptionId(opt), opt.numero_doc]
            .filter(Boolean).map(v => String(v).toLowerCase()).join(' ');
        return searchableText.includes(term);
    }) || []);

    const selectedOption = activeOptions?.find(opt => String(getOptionId(opt)) === String(value));
    const selectedLabel = selectedOption 
        ? getOptionLabel(selectedOption) 
        : (value && fallbackLabel ? fallbackLabel : null);

    const updateDropdownPosition = useCallback(() => {
        if (!containerRef.current) return;

        const rect = containerRef.current.getBoundingClientRect();
        const gap = 4;
        const viewportPadding = 12;
        const defaultMaxHeight = 320;
        const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
        const spaceAbove = rect.top - viewportPadding;
        const openUp = spaceBelow < 220 && spaceAbove > spaceBelow;
        const maxHeight = Math.min(defaultMaxHeight, Math.max(180, openUp ? spaceAbove - gap : spaceBelow - gap));

        const nextStyle: CSSProperties = {
            position: 'fixed',
            left: rect.left,
            top: openUp ? undefined : rect.bottom + gap,
            bottom: openUp ? window.innerHeight - rect.top + gap : undefined,
            width: rect.width,
            maxHeight,
            zIndex: 9999,
            visibility: 'visible'
        };

        setDropdownStyle(prev => {
            if (
                prev.left === nextStyle.left &&
                prev.top === nextStyle.top &&
                prev.bottom === nextStyle.bottom &&
                prev.width === nextStyle.width &&
                prev.maxHeight === nextStyle.maxHeight
            ) {
                return prev;
            }

            return nextStyle;
        });
    }, []);

    const scheduleDropdownPositionUpdate = useCallback(() => {
        if (positionFrameRef.current !== null) return;

        positionFrameRef.current = window.requestAnimationFrame(() => {
            positionFrameRef.current = null;
            updateDropdownPosition();
        });
    }, [updateDropdownPosition]);

    // Calcula posición ANTES del paint para evitar que el dropdown aparezca
    // brevemente sin position:fixed y provoque un layout shift en la página.
    useLayoutEffect(() => {
        if (!isOpen) return;
        updateDropdownPosition();
    }, [isOpen, updateDropdownPosition]);

    useEffect(() => {
        if (!isOpen) return;

        window.addEventListener('resize', scheduleDropdownPositionUpdate);
        window.addEventListener('scroll', scheduleDropdownPositionUpdate, true);

        return () => {
            window.removeEventListener('resize', scheduleDropdownPositionUpdate);
            window.removeEventListener('scroll', scheduleDropdownPositionUpdate, true);

            if (positionFrameRef.current !== null) {
                window.cancelAnimationFrame(positionFrameRef.current);
                positionFrameRef.current = null;
            }
        };
    }, [isOpen, scheduleDropdownPositionUpdate]);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            const target = e.target as Node;
            const isInsideControl = containerRef.current?.contains(target);
            const isInsideDropdown = dropdownRef.current?.contains(target);

            if (!isInsideControl && !isInsideDropdown) {
                setIsOpen(false);
                setSearchTerm("");
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const dropdownContent = isOpen ? (
        <div
            ref={dropdownRef}
            style={dropdownStyle}
            className="bg-white border border-slate-200 rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        >
            <div className="p-2 border-b border-slate-100 bg-slate-50 relative">
                <IconSearch size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                    autoFocus
                    type="text"
                    placeholder="Buscar..."
                    className="w-full pl-8 pr-8 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:border-blue-400 bg-white"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
                {isLoading && <IconLoader size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-500 animate-spin" />}
            </div>

            <ul className="max-h-52 overflow-y-auto custom-scrollbar relative">
                {filteredOptions.length > 0 ? (
                    filteredOptions.map((opt, index) => {
                        const optId = getOptionId(opt);
                        const optLabel = getOptionLabel(opt);
                        return (
                            <li
                                key={`${optId}-${index}`}
                                onClick={() => {
                                    onChange({ target: { name, value: optId }, option: opt });
                                    setIsOpen(false);
                                    setSearchTerm("");
                                }}
                                className={`px-4 py-2 text-xs cursor-pointer transition-colors flex items-center justify-between
                                    ${String(optId) === String(value) ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
                            >
                                <div className="flex flex-col">
                                    <span className="uppercase">{optLabel}</span>
                                    {opt.aux && <span className="text-[9px] text-slate-400">{opt.aux}</span>}
                                </div>
                                {String(optId) === String(value) && <IconCheck size={14} />}
                            </li>
                        );
                    })
                ) : (
                    <li className="px-4 py-6 text-center text-xs text-slate-400 italic">
                        {isLoading ? 'Buscando...' : 'No hay resultados'}
                    </li>
                )}
            </ul>
        </div>
    ) : null;

    return (
        <>
            <div className="flex flex-col gap-1.5 relative text-left" ref={containerRef}>
                {label && <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">{label}</label>}
                
                <div 
                    onClick={() => !disabled && setIsOpen(!isOpen)}
                    className={`w-full border p-2.5 rounded-lg flex justify-between items-center text-xs transition-all select-none
                        ${disabled ? 'bg-slate-50 text-slate-400 cursor-not-allowed border-slate-200' 
                                : `bg-white cursor-pointer ${isOpen ? 'border-blue-500 ring-2 ring-blue-50' : 'border-slate-200 hover:border-slate-300'}`}`}
                >
                    <span className={`truncate uppercase ${!selectedLabel ? 'text-slate-400' : (disabled ? 'text-slate-400' : 'text-slate-700 font-semibold')}`}>
                        {selectedLabel || placeholder}
                    </span>
                    <IconChevronDown size={16} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </div>
            </div>
            {dropdownContent && createPortal(dropdownContent, document.body)}
        </>
    );
}
