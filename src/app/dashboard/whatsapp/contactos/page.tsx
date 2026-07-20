"use client";

import { useEffect, useState } from 'react';
import { IconBan, IconEdit, IconFilter, IconPlus, IconRefresh, IconSearch, IconTrash, IconUserCheck } from '@tabler/icons-react';
import DataTable from '@/components/shared/DataTable';
import FiltrosAvanzados from '@/components/filter/FiltrosAvanzados';
import SearchableSelect from '@/components/forms/SearchableSelect';
import { useCrud } from '@/hooks/useCrud';
import { useDebounce } from '@/hooks/useDebounce';
import { contactoWhatsAppService } from '@/services/contactoWhatsAppService';
import { CLIENTE_WHATSAPP_ID } from '@/lib/whatsappConfig';
import { ContactoWhatsApp } from '@/types';
import WhatsAppPageHeader from '../components/WhatsAppPageHeader';
import ContactoWhatsAppFormModal from './components/ContactoWhatsAppFormModal';

export default function ContactosWhatsAppPage() {
    const { data, loading, meta, searchTerm, setSearchTerm, filters, setFilters, fetchData, handleAction } = useCrud<ContactoWhatsApp>(contactoWhatsAppService, CLIENTE_WHATSAPP_ID, { optIn: [] as Array<boolean | string | number> });
    const [showForm, setShowForm] = useState(false);
    const [selected, setSelected] = useState<ContactoWhatsApp | null>(null);
    const [showFilters, setShowFilters] = useState(false);
    const [tempOptIn, setTempOptIn] = useState('');
    const debouncedSearch = useDebounce(searchTerm, 450);

    useEffect(() => { fetchData(1, debouncedSearch, filters); }, [debouncedSearch, fetchData, filters]);

    const columns = [
        {
            header: 'Contacto', render: (row: ContactoWhatsApp) => (
                <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-700"><IconUserCheck size={17} /></div>
                    <div><p className="text-xs font-bold text-slate-800">{row.nombre || 'Sin nombre'}</p><p className="font-mono text-[11px] text-slate-500">{row.numero_telefono}</p></div>
                </div>
            )
        },
        {
            header: 'Consentimiento', width: '150px', render: (row: ContactoWhatsApp) => (
                <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-black ${row.opt_in ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
                    {row.opt_in ? 'OPT-IN ACTIVO' : 'SIN OPT-IN'}
                </span>
            )
        },
        { header: 'Última actividad', width: '180px', render: (row: ContactoWhatsApp) => <span className="text-xs text-slate-600">{row.ultima_actividad ? new Date(row.ultima_actividad).toLocaleString('es-PE') : '-'}</span> },
        {
            header: 'Acciones', width: '140px', className: 'text-center', render: (row: ContactoWhatsApp) => (
                <div className="flex justify-center gap-1">
                    <button type="button" onClick={() => { setSelected(row); setShowForm(true); }} className="rounded p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600" title="Editar"><IconEdit size={18} /></button>
                    <button type="button" onClick={() => handleAction(row.contactoWhatsappId, 'anular')} className="rounded p-1.5 text-slate-400 hover:bg-amber-50 hover:text-amber-600" title={row.opt_in ? 'Desactivar opt-in' : 'Activar opt-in'}><IconBan size={18} /></button>
                    <button type="button" onClick={() => handleAction(row.contactoWhatsappId, 'delete')} className="rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600" title="Eliminar"><IconTrash size={18} /></button>
                </div>
            )
        }
    ];

    return (
        <div className="p-6">
            <WhatsAppPageHeader title="Contactos de WhatsApp" description="Directorio y consentimiento de comunicaciones" actions={
                <>
                    <button type="button" onClick={() => fetchData(meta.currentPage, debouncedSearch)} className="rounded-lg border border-slate-300 bg-white p-2.5 text-slate-500 hover:text-emerald-600"><IconRefresh size={19} className={loading ? 'animate-spin' : ''} /></button>
                    <button type="button" onClick={() => { setTempOptIn(filters.optIn?.[0] === undefined ? '' : String(filters.optIn[0])); setShowFilters(true); }} className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-600"><IconFilter size={18} /> Filtros</button>
                    <button type="button" onClick={() => { setSelected(null); setShowForm(true); }} className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white"><IconPlus size={18} /> Nuevo contacto</button>
                </>
            } />
            <div className="relative mb-4">
                <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input value={searchTerm} onChange={(event) => setSearchTerm(event.target.value)} placeholder="Buscar por nombre o número..." className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-4 text-sm outline-none focus:border-emerald-500" />
            </div>
            <DataTable columns={columns} data={data} loading={loading} meta={meta} onPageChange={(page) => fetchData(page, debouncedSearch, filters)} />
            <FiltrosAvanzados isOpen={showFilters} onClose={() => setShowFilters(false)} onApply={() => setFilters({ optIn: tempOptIn ? [tempOptIn] : [] })} onClear={() => { setTempOptIn(''); setFilters({ optIn: [] }); }} totalActive={tempOptIn ? 1 : 0}>
                <SearchableSelect label="Consentimiento" value={tempOptIn} options={[{ value: 'true', label: 'CON OPT-IN' }, { value: 'false', label: 'SIN OPT-IN' }]} onChange={(event) => setTempOptIn(String(event.target.value))} placeholder="Todos los contactos" />
            </FiltrosAvanzados>
            <ContactoWhatsAppFormModal isOpen={showForm} contactToEdit={selected} onClose={() => setShowForm(false)} onSuccess={() => fetchData(meta.currentPage, debouncedSearch)} />
        </div>
    );
}
