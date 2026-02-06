"use client";
import { useState, useEffect, useRef } from 'react';
import { IconChevronDown, IconSearch, IconCheck } from '@tabler/icons-react';

interface Option {
    key: string | number;
    value: string;
    aux?: string | number;
}

interface Props {
    label?: string;
    name?: string;
    value: string | number;
    onChange: (e: any) => void;
    options: Option[] | undefined;
    disabled?: boolean;
    placeholder?: string;
}

export default function SearchableSelect({ label, name, value, onChange, options = [], disabled, placeholder = "-- Seleccione --" }: Props) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const containerRef = useRef<HTMLDivElement>(null);

    const filteredOptions = options?.filter(opt => 
        String(opt.value || "").toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

    const selectedOption = options?.find(opt => String(opt.key) === String(value));
    const selectedLabel = selectedOption ? selectedOption.value : null;

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

    return (
        <div className="flex flex-col gap-1.5 relative text-left" ref={containerRef}>
            {label && <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">{label}</label>}
            
            <div 
                onClick={() => !disabled && setIsOpen(!isOpen)}
                // CAMBIO CLAVE AQUI: 
                // 1. Quitamos 'bg-white' y 'cursor-pointer' de las clases base.
                // 2. Usamos lógica estricta: Si es disabled -> Gris y cursor prohibido. Si NO -> Blanco y cursor mano.
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
                            filteredOptions.map((opt) => (
                                <li 
                                    key={opt.key}
                                    onClick={() => {
                                        onChange({ target: { name, value: opt.key } });
                                        setIsOpen(false);
                                        setSearchTerm("");
                                    }}
                                    className={`px-4 py-2 text-xs cursor-pointer transition-colors flex items-center justify-between
                                        ${String(opt.key) === String(value) ? 'bg-blue-50 text-blue-700 font-bold' : 'text-slate-600 hover:bg-slate-50'}`}
                                >
                                    <div className="flex flex-col">
                                        <span className="uppercase">{opt.value}</span>
                                        {opt.aux && <span className="text-[9px] text-slate-400">{opt.aux}</span>}
                                    </div>
                                    {String(opt.key) === String(value) && <IconCheck size={14} />}
                                </li>
                            ))
                        ) : (
                            <li className="px-4 py-6 text-center text-xs text-slate-400 italic">No hay resultados</li>
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
}