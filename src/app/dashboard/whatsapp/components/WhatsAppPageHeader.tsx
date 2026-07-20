import { IconBrandWhatsapp } from '@tabler/icons-react';

export default function WhatsAppPageHeader({ title, description, actions }: {
    title: string;
    description: string;
    actions?: React.ReactNode;
}) {
    return (
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700">
                    <IconBrandWhatsapp size={25} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
                    <p className="text-sm text-slate-500">{description}</p>
                </div>
            </div>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
    );
}
