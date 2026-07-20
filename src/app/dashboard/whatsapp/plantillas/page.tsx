"use client";

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { IconEdit, IconFilter, IconPlus, IconRefresh, IconSettings, IconTrash } from '@tabler/icons-react';
import DataTable from '@/components/shared/DataTable';
import FiltrosAvanzados from '@/components/filter/FiltrosAvanzados';
import MultiSelect from '@/components/forms/MultiSelect';
import Modal from '@/components/ui/Modal';
import SearchableSelect from '@/components/forms/SearchableSelect';
import ValidatedFormInput from '@/components/forms/ValidatedFormInput';
import { useCrud } from '@/hooks/useCrud';
import { plantillaWhatsAppService } from '@/services/plantillaWhatsAppService';
import { CLIENTE_WHATSAPP_ID, getApiErrorMessage } from '@/lib/whatsappConfig';
import { CategoriaPlantillaWhatsApp, EstadoAprobacionPlantilla, PlantillaWhatsApp } from '@/types';
import { CATEGORIA_PLANTILLA_WHATSAPP_OPTIONS, ESTADO_APROBACION_PLANTILLA_OPTIONS } from '@/utils/selectOptions';
import WhatsAppPageHeader from '../components/WhatsAppPageHeader';
import WhatsAppStatusBadge from '../components/WhatsAppStatusBadge';
import PlantillaWhatsAppFormModal from './components/PlantillaWhatsAppFormModal';

type Filters = { categoria: CategoriaPlantillaWhatsApp[]; estadoAprobacion: EstadoAprobacionPlantilla[] };
const initialFilters: Filters = { categoria: [], estadoAprobacion: [] };

export default function PlantillasWhatsAppPage() {
    const { data, loading, meta, filters, setFilters, fetchData, handleAction } = useCrud<PlantillaWhatsApp>(plantillaWhatsAppService, CLIENTE_WHATSAPP_ID, initialFilters);
    const [tempFilters, setTempFilters] = useState<Filters>(initialFilters);
    const [showFilters, setShowFilters] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [selected, setSelected] = useState<PlantillaWhatsApp | null>(null);
    const [approvalTemplate, setApprovalTemplate] = useState<PlantillaWhatsApp | null>(null);
    const [approvalStatus, setApprovalStatus] = useState<EstadoAprobacionPlantilla>('en_revision');
    const [providerName, setProviderName] = useState('');
    const [savingApproval, setSavingApproval] = useState(false);

    useEffect(() => { fetchData(1, '', filters); }, [fetchData, filters]);

    const saveApproval = async () => {
        if (!approvalTemplate) return;
        setSavingApproval(true);
        try {
            const response = await plantillaWhatsAppService.changeEstadoAprobacion(approvalTemplate.plantillaWhatsappId, approvalStatus, providerName);
            if (!response.isSuccess) return toast.error(response.message || 'No se pudo actualizar la aprobación.');
            toast.success('Estado de aprobación actualizado.');
            setApprovalTemplate(null);
            fetchData(meta.currentPage, '', filters);
        } catch (error) {
            toast.error(getApiErrorMessage(error, 'No se pudo actualizar la aprobación.'));
        } finally {
            setSavingApproval(false);
        }
    };

    const columns = [
        { header: 'Plantilla', render: (row: PlantillaWhatsApp) => <div><p className="text-xs font-bold text-slate-800">{row.nombre_interno}</p><p className="mt-1 line-clamp-2 max-w-xl text-[11px] text-slate-500">{row.cuerpo_texto}</p></div> },
        { header: 'Categoría', width: '180px', render: (row: PlantillaWhatsApp) => <span className="text-[11px] font-semibold uppercase text-slate-600">{row.categoria.replaceAll('_', ' ')}</span> },
        { header: 'Idioma', width: '80px', render: (row: PlantillaWhatsApp) => <span className="font-mono text-xs uppercase">{row.idioma}</span> },
        { header: 'Aprobación', width: '140px', render: (row: PlantillaWhatsApp) => <WhatsAppStatusBadge status={row.estado_aprobacion} /> },
        { header: 'Origen', width: '100px', render: (row: PlantillaWhatsApp) => <span className="text-[10px] font-bold text-slate-500">{row.clienteWhatsappId ? 'CLIENTE' : 'SISTEMA'}</span> },
        {
            header: 'Acciones', width: '150px', className: 'text-center', render: (row: PlantillaWhatsApp) => (
                <div className="flex justify-center gap-1">
                    <button type="button" onClick={() => { setSelected(row); setShowForm(true); }} disabled={!row.clienteWhatsappId} className="rounded p-1.5 text-slate-400 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-30" title="Editar"><IconEdit size={18} /></button>
                    <button type="button" onClick={() => { setApprovalTemplate(row); setApprovalStatus(row.estado_aprobacion); setProviderName(row.nombre_proveedor || ''); }} className="rounded p-1.5 text-slate-400 hover:bg-amber-50 hover:text-amber-600" title="Estado de aprobación"><IconSettings size={18} /></button>
                    <button type="button" onClick={() => handleAction(row.plantillaWhatsappId, 'delete')} disabled={!row.clienteWhatsappId} className="rounded p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-30" title="Eliminar"><IconTrash size={18} /></button>
                </div>
            )
        }
    ];

    return (
        <div className="p-6">
            <WhatsAppPageHeader title="Plantillas de WhatsApp" description="Mensajes aprobados y contenido reutilizable" actions={
                <>
                    <button type="button" onClick={() => fetchData(meta.currentPage, '', filters)} className="rounded-lg border border-slate-300 bg-white p-2.5 text-slate-500 hover:text-emerald-600"><IconRefresh size={19} className={loading ? 'animate-spin' : ''} /></button>
                    <button type="button" onClick={() => { setTempFilters(filters); setShowFilters(true); }} className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-600"><IconFilter size={18} /> Filtros</button>
                    <button type="button" onClick={() => { setSelected(null); setShowForm(true); }} className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white"><IconPlus size={18} /> Nueva plantilla</button>
                </>
            } />
            <DataTable columns={columns} data={data} loading={loading} meta={meta} onPageChange={(page) => fetchData(page, '', filters)} />
            <FiltrosAvanzados isOpen={showFilters} onClose={() => setShowFilters(false)} onApply={() => setFilters(tempFilters)} onClear={() => { setTempFilters(initialFilters); setFilters(initialFilters); }} totalActive={tempFilters.categoria.length + tempFilters.estadoAprobacion.length}>
                <MultiSelect label="Categoría" options={[...CATEGORIA_PLANTILLA_WHATSAPP_OPTIONS]} value={tempFilters.categoria} onChange={(values) => setTempFilters(prev => ({ ...prev, categoria: values as CategoriaPlantillaWhatsApp[] }))} />
                <MultiSelect label="Estado de aprobación" options={[...ESTADO_APROBACION_PLANTILLA_OPTIONS]} value={tempFilters.estadoAprobacion} onChange={(values) => setTempFilters(prev => ({ ...prev, estadoAprobacion: values as EstadoAprobacionPlantilla[] }))} />
            </FiltrosAvanzados>
            <PlantillaWhatsAppFormModal isOpen={showForm} templateToEdit={selected} onClose={() => setShowForm(false)} onSuccess={() => fetchData(meta.currentPage, '', filters)} />
            <Modal isOpen={!!approvalTemplate} onClose={() => setApprovalTemplate(null)} title="Estado de aprobación" size="sm">
                <div className="space-y-4">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs font-bold text-slate-700">{approvalTemplate?.nombre_interno}</div>
                    <SearchableSelect label="Estado" value={approvalStatus} options={[...ESTADO_APROBACION_PLANTILLA_OPTIONS]} onChange={(event) => setApprovalStatus(event.target.value as EstadoAprobacionPlantilla)} />
                    <ValidatedFormInput label="Nombre en proveedor" value={providerName} onChange={(event) => setProviderName(event.target.value)} />
                    <div className="flex justify-end gap-2 border-t border-slate-100 pt-4"><button type="button" onClick={() => setApprovalTemplate(null)} className="px-4 py-2 text-xs font-bold text-slate-500">Cancelar</button><button type="button" onClick={saveApproval} disabled={savingApproval} className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">Guardar estado</button></div>
                </div>
            </Modal>
        </div>
    );
}
