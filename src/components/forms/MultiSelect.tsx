"use client";
import { useState, useRef, useEffect } from 'react';
import { IconChevronDown, IconCheck, IconSearch, IconLoader } from '@tabler/icons-react';
import { catalogService } from '@/services/catalogService';

interface Option {
    label: string;
    value: string | number;
}

interface MultiSelectProps {
    label?: string;
    options?: Option[]; // Ahora es opcional
    value: (string | number)[];
    onChange: (newValue: (string | number)[]) => void;
    placeholder?: string;
    // 🚀 Nuevas Props para Modo Asíncrono
    endpoint?: string;
    fetchParams?: Record<string, any>;
    searchDebounceMs?: number;
}

export default function MultiSelect({ 
    label, 
    options = [], 
    value = [], 
    onChange, 
    placeholder = "Todos",
    endpoint,
    fetchParams,
    searchDebounceMs = 400
}: MultiSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const dropdownRef = useRef<HTMLDivElement>(null);

    // 🚀 Estados para Modo Asíncrono
    const [asyncOptions, setAsyncOptions] = useState<Option[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const isAsync = !!endpoint;

    // Efecto para búsquedas al backend
    useEffect(() => {
        if (!isAsync) return;

        const fetchAsync = async () => {
            setIsLoading(true);
            try {
                const res = await catalogService.getDynamicCatalog(endpoint, {
                    ...fetchParams,
                    search: searchTerm
                });
                
                // Mapear la respuesta de SelectOption a nuestro formato interno Option
                const mappedOptions = res.map((opt: any) => ({
                    label: opt.label || opt.value || String(opt.key),
                    value: opt.value || opt.key
                }));
                
                setAsyncOptions(mappedOptions);
            } catch (error) {
                console.error("Error en MultiSelect Async:", error);
            } finally {
                setIsLoading(false);
            }
        };

        const timer = window.setTimeout(fetchAsync, searchDebounceMs);
        return () => window.clearTimeout(timer);
    }, [endpoint, searchTerm, JSON.stringify(fetchParams), isAsync, searchDebounceMs]);

    // Qué opciones procesamos
    const activeOptions = isAsync ? asyncOptions : options;

    // Filtrar opciones por el buscador interno (Solo en modo estático)
    const filteredOptions = isAsync 
        ? activeOptions 
        : activeOptions.filter(opt => String(opt.label || "").toLowerCase().includes(searchTerm.toLowerCase()));

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setIsOpen(false);
                setSearchTerm("");
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const toggleOption = (optionValue: string | number) => {
        const newValue = value.includes(optionValue)
            ? value.filter(v => String(v) !== String(optionValue))
            : [...value, optionValue];
        onChange(newValue);
    };

    return (
        <div className="flex flex-col gap-1.5 w-full relative" ref={dropdownRef}>
            {label && <label className="text-xs font-bold text-slate-500 uppercase ml-1">{label}</label>}
            
            <div 
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full bg-white border cursor-pointer transition-all rounded-lg px-3 py-2.5 flex items-center justify-between min-h-[42px]
                    ${isOpen ? 'border-blue-500 ring-2 ring-blue-50' : 'border-slate-200 hover:border-slate-300'}`}
            >
                <div className="flex flex-wrap gap-1 items-center overflow-hidden">
                    {value.length > 0 ? (
                        <span className="text-sm text-blue-700 font-bold bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                            {value.length} seleccionado{value.length !== 1 ? 's' : ''}
                        </span>
                    ) : (
                        <span className="text-slate-400 text-sm">{placeholder}</span>
                    )}
                </div>
                <IconChevronDown size={16} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {isOpen && (
                <div className="absolute top-[calc(100%+4px)] z-[100] w-full bg-white border border-slate-200 rounded-xl shadow-xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                    
                    {/* BUSCADOR INTERNO */}
                    <div className="p-2 border-b border-slate-100 bg-slate-50 relative">
                        <IconSearch size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                            autoFocus
                            type="text"
                            placeholder="Buscar filtro..."
                            className="w-full pl-8 pr-8 py-1.5 text-xs border border-slate-200 rounded-md focus:outline-none focus:border-blue-400 bg-white"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        {isLoading && <IconLoader size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-500 animate-spin" />}
                    </div>

                    {/* LISTA DE OPCIONES */}
                    <div className="max-h-60 overflow-y-auto custom-scrollbar">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((option, index) => {
                                const hasValidValue = String(option.value ?? '').trim() !== '';
                                const isSelected = value.some(v => String(v) === String(option.value));
                                
                                return (
                                    <div
                                        key={`${option.value}-${index}`}
                                        onClick={() => hasValidValue && toggleOption(option.value)}
                                        className={`flex items-center gap-3 px-3 py-2.5 transition-colors group
                                            ${hasValidValue ? 'hover:bg-slate-50 cursor-pointer' : 'bg-slate-50/60 cursor-not-allowed opacity-60'}`}
                                    >
                                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all
                                            ${isSelected 
                                                ? 'bg-blue-600 border-blue-600' 
                                                : 'border-slate-300 group-hover:border-blue-400'}`}
                                        >
                                            {isSelected && <IconCheck size={12} className="text-white" stroke={4} />}
                                        </div>
                                        <span className={`text-sm truncate ${isSelected ? 'text-blue-700 font-semibold' : 'text-slate-600'}`}>
                                            {option.label}
                                        </span>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="p-4 text-center text-xs text-slate-400 italic">
                                {isLoading ? 'Buscando...' : 'Sin resultados'}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}