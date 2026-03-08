// src/components/forms/SearchableSelect.tsx
"use client";
import { useState, useEffect, useRef } from 'react';
import { IconChevronDown, IconSearch, IconCheck } from '@tabler/icons-react';

// 🚀 1. ACTUALIZAMOS LA INTERFAZ: Ahora es híbrida y soporta el estándar moderno (label)
interface Option {
    key?: string | number;
    value: string | number; // Ahora puede ser el ID (nuevo estándar) o el Texto (viejo estándar)
    label?: string;         // Texto a mostrar (nuevo estándar)
    aux?: string | number;
    descripcion?: string;
    nombre?: string;
}

interface Props {
    label?: string;
    name?: string;
    value: string | number;
    onChange: (e: { target: { name?: string; value: string | number } }) => void;
    options: Option[] | undefined;
    disabled?: boolean;
    placeholder?: string;
    onSearchChange?: (term: string) => void;
    searchDebounceMs?: number;
}

export default function SearchableSelect({
    label,
    name,
    value,
    onChange,
    options = [],
    disabled,
    placeholder = "-- Seleccione --",
    onSearchChange,
    searchDebounceMs = 300
}: Props) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const containerRef = useRef<HTMLDivElement>(null);

    // 🚀 2. FUNCIONES DE EXTRACCIÓN INTELIGENTES
    // Si no viene label, intentamos campos comunes antes de caer al value (evita mostrar IDs).
    const getOptionLabel = (opt: Option) =>
        opt.label ??
        opt.descripcion ??
        opt.nombre ??
        (typeof opt.aux === 'string' && opt.aux.trim() ? opt.aux : undefined) ??
        opt.value;
    // Si tiene 'value' y también 'label', el ID es el 'value'. Si no, usamos 'key'.
    const getOptionId = (opt: Option) => (opt.label !== undefined ? opt.value : (opt.key ?? opt.value));

    // 🚀 3. BUSCADOR CORREGIDO: Ahora busca por el Texto (Label), no por el ID
    const filteredOptions = options?.filter(opt => {
        const term = searchTerm.toLowerCase().trim();
        if (!term) return true;

        const searchableText = [
            getOptionLabel(opt),
            opt.aux,
            getOptionId(opt),
            (opt as any).direccion,
            (opt as any).email,
            (opt as any).telefono_movil,
            (opt as any).telefono_movil2,
            (opt as any).telefono_fijo,
            (opt as any).telefono_fijo2,
            (opt as any).numero_doc,
            (opt as any).num_docident,
            (opt as any).nro_documento,
            (opt as any).descripcion,
            (opt as any).marca,
            (opt as any).certificado_inscripcion,
            (opt as any).nro_matricula_cabina,
            (opt as any).nro_matricula_carrosa1,
            (opt as any).nro_matricula_carrosa2,
            (opt as any).nro_matricula_carrosa3,
            (opt as any).observaciones,
            (opt as any).peso_maximo,
            (opt as any).modelo?.descripcion,
            (opt as any).modelo?.marca?.descripcion,
            (opt as any).nombres,
            (opt as any).apellidos,
            (opt as any).correo,
            (opt as any).licencia_conducir
        ]
            .filter(Boolean)
            .map(v => String(v).toLowerCase())
            .join(' ');

        return searchableText.includes(term);
    }) || [];

    // 🚀 4. SELECCIÓN CORREGIDA: Compara usando el ID correcto
    const selectedOption = options?.find(opt => String(getOptionId(opt)) === String(value));
    const selectedLabel = selectedOption ? getOptionLabel(selectedOption) : null;

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsOpen(false);
                setSearchTerm("");
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        if (!onSearchChange) return;
        const timer = window.setTimeout(() => onSearchChange(searchTerm), searchDebounceMs);
        return () => window.clearTimeout(timer);
    }, [searchTerm, onSearchChange, searchDebounceMs]);

    return (
        <div className="flex flex-col gap-1.5 relative text-left" ref={containerRef}>
            {label && <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">{label}</label>}
            
            <div 
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={`w-full border p-2.5 rounded-lg flex justify-between items-center text-xs transition-all select-none
                    ${disabled 
                        ? 'bg-slate-50 text-slate-400 cursor-not-allowed border-slate-200' 
                        : `bg-white cursor-pointer ${isOpen ? 'border-blue-500 ring-2 ring-blue-50' : 'border-slate-200 hover:border-slate-300'}`
                    }`}
            >
                <span className={`truncate uppercase ${!selectedLabel ? 'text-slate-400' : (disabled ? 'text-slate-400' : 'text-slate-700 font-semibold')}`}>
                    {selectedLabel || placeholder}
                </span>
                <IconChevronDown size={16} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {isOpen && (
                <div className="absolute top-[calc(100%+4px)] left-0 w-full bg-white border border-slate-200 rounded-xl shadow-xl z-[120] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                    <div className="p-2 border-b border-slate-100 bg-slate-50">
                        <div className="relative">
                            <IconSearch size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                                autoFocus
                                type="text"
                                placeholder="Buscar..."
                                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:border-blue-400 bg-white"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <ul className="max-h-52 overflow-y-auto custom-scrollbar">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((opt, index) => {
                                const optId = getOptionId(opt);
                                const optLabel = getOptionLabel(opt);
                                
                                return (
                                    <li 
                                        // Usamos un fallback en el key por si acaso vienen duplicados o sin ID
                                        key={`${optId}-${index}`}
                                        onClick={() => {
                                            // 🚀 5. ONCHANGE CORREGIDO: Enviamos el ID correcto al padre
                                            onChange({ target: { name, value: optId } });
                                            setIsOpen(false);
                                            setSearchTerm("");
                                        }}
                                        className={`px-4 py-2 text-xs cursor-pointer transition-colors flex items-center justify-between
                                            ${String(optId) === String(value) ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
                                    >
                                        <div className="flex flex-col">
                                            {/* 🚀 6. MOSTRAMOS LA DESCRIPCIÓN, NO EL ID */}
                                            <span className="uppercase">{optLabel}</span>
                                            {opt.aux && <span className="text-[9px] text-slate-400">{opt.aux}</span>}
                                        </div>
                                        {String(optId) === String(value) && <IconCheck size={14} />}
                                    </li>
                                );
                            })
                        ) : (
                            <li className="px-4 py-6 text-center text-xs text-slate-400 italic">No hay resultados</li>
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
}
