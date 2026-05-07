// src/components/shared/ReportCard.tsx
import React from 'react';

interface Props {
    title: string;
    description?: string;
    icon?: React.ReactNode;
    gradientClass?: string;
    children: React.ReactNode;
}

export default function ReportCard({ 
    title, 
    description,
    icon,
    gradientClass = 'bg-gradient-to-br from-cyan-400 to-blue-700', 
    children 
}: Props) {
    return (
        <article className="group flex min-h-[430px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg">
            <div className={`${gradientClass} relative overflow-hidden px-5 py-4 text-white`}>
                <div className="absolute inset-x-0 bottom-0 h-px bg-white/25" />
                <div className="flex items-start gap-3">
                    {icon && (
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-white/25 bg-white/15 shadow-sm backdrop-blur">
                            {icon}
                        </div>
                    )}
                    <div className="min-w-0">
                        <h3 className="text-sm font-bold uppercase leading-tight tracking-wide">
                            {title}
                        </h3>
                        {description && (
                            <p className="mt-1 text-xs leading-snug text-white/85">
                                {description}
                            </p>
                        )}
                    </div>
                </div>
            </div>

            <div className="flex flex-1 flex-col gap-4 p-4">
                {children}
            </div>
        </article>
    );
}
