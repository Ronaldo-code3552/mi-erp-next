// src/app/dashboard/unidad-transporte/components/UnidadFormModal.tsx
"use client";
import { useState, useEffect } from 'react';
import { unidadTransporteService } from '@/services/unidadTransporteService';
import { marcaService } from '@/services/marcaService';
import { modeloService } from '@/services/modeloService';
import { useCatalogs } from '@/hooks/useCatalogs';
import { SelectOption } from '@/types/catalog.types';

import Modal from '@/components/ui/Modal';
import SearchableSelect from '@/components/forms/SearchableSelect';
import ExternalSearchInput from '@/components/forms/ExternalSearchInput';
import ValidatedFormInput from '@/components/forms/ValidatedFormInput'; 
import SimpleCrudModal from '@/components/forms/SimpleCrudModal';
import { IconDeviceFloppy, IconLoader, IconPlus, IconEdit } from '@tabler/icons-react';
import { toast } from 'sonner';
import { UnidadTransporte } from '@/types/unidadTransporte.types';
import { PlacaVehiculoResponse } from '@/types/apiExternal.types';
import { useValidation } from '@/hooks/useValidation';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    unitToEdit?: UnidadTransporte | null;
}

export default function UnidadFormModal({ isOpen, onClose, onSuccess, unitToEdit }: Props) {
    const [loading, setLoading] = useState(false);
    const EMPRESA_ID = "005";

    // 1. Catálogos Dinámicos
    const { catalogs, loadingCatalogs, refreshCatalogs } = useCatalogs(isOpen ? ['Marca', 'Modelo'] : []);

    const [selectedMarca, setSelectedMarca] = useState("");
    const [filteredModelos, setFilteredModelos] = useState<SelectOption[]>([]);
    
    const [crudModal, setCrudModal] = useState<{ type: 'MARCA' | 'MODELO' | null, action: 'ADD' | 'EDIT' | null, data?: any }>({ type: null, action: null });

    const isReadOnly = !!(unitToEdit && unitToEdit.estado === "0");
    const isEditing = !!unitToEdit;
    const { hasError, addError, clearError, resetErrors } = useValidation();

    const initialState: Partial<UnidadTransporte> = {
        descripcion: '', nro_matricula_cabina: '', modeloId: '', peso_maximo: 0,
        certificado_inscripcion: '', nro_matricula_carrosa1: '', nro_matricula_carrosa2: '', nro_matricula_carrosa3: '',
        observaciones: '', empresaId: EMPRESA_ID, estado: '1'
    };

    const [formData, setFormData] = useState<Partial<UnidadTransporte>>(initialState);
    const normalizeId = (value: unknown) => (typeof value === 'string' ? value.trim() : value);

    // 2. Inicializar Datos
    useEffect(() => {
        if (!isOpen) return;

        resetErrors();
        if (unitToEdit) {
            setFormData({
                ...initialState,
                ...unitToEdit,
                modeloId: String(normalizeId(unitToEdit.modeloId) || '')
            });
            if (unitToEdit.modelo?.marcaId) {
                setSelectedMarca(String(normalizeId(unitToEdit.modelo.marcaId) || ''));
            } else {
                setSelectedMarca("");
            }
        } else {
            setFormData(initialState);
            setSelectedMarca("");
        }
    }, [isOpen, unitToEdit]);

    // Si en unitToEdit no vino la marca anidada, la inferimos desde el catálogo de modelos.
    useEffect(() => {
        if (!isOpen || !unitToEdit || selectedMarca || !catalogs['Modelo']) return;
        const modeloActual = catalogs['Modelo'].find(
            m => String(normalizeId(m.value)) === String(normalizeId(unitToEdit.modeloId))
        );
        if (modeloActual?.groupKey) {
            setSelectedMarca(String(normalizeId(modeloActual.groupKey) || ''));
        }
    }, [isOpen, unitToEdit, selectedMarca, catalogs]);

    // 3. Filtrar Modelos al cambiar la Marca
    useEffect(() => {
        if (selectedMarca && catalogs['Modelo']) {
            const marcaActual = String(normalizeId(selectedMarca) || '');
            const filtrados = catalogs['Modelo'].filter(
                m => String(normalizeId(m.groupKey)) === marcaActual
            );
            setFilteredModelos(filtrados);
            
            setFormData(prev => {
                const prevModeloId = String(normalizeId(prev.modeloId) || '');
                const existeModelo = filtrados.some(
                    f => String(normalizeId(f.value)) === prevModeloId
                );
                if (prevModeloId && !existeModelo) {
                    if (unitToEdit && String(normalizeId(unitToEdit.modelo?.marcaId)) === marcaActual) {
                        return prev;
                    }
                    return { ...prev, modeloId: '' };
                }
                return prev;
            });
        } else {
            setFilteredModelos([]);
        }
    }, [selectedMarca, catalogs, unitToEdit]);

    const handleMarcaChange = (e: any) => {
        setSelectedMarca(e.target.value);
    };

    const handleChange = (e: any) => {
        const { name, value } = e.target;
        let finalValue = value;
        if (
            name === 'nro_matricula_cabina' ||
            name === 'descripcion' ||
            name === 'certificado_inscripcion' ||
            name === 'nro_matricula_carrosa1' ||
            name === 'nro_matricula_carrosa2' ||
            name === 'nro_matricula_carrosa3'
        ) {
            finalValue = String(value || '').toUpperCase();
        }
        if (name === 'modeloId') finalValue = String(normalizeId(value) || '');
        if (name === 'peso_maximo') {
            if (value === '') finalValue = '';
            else {
                const numericValue = Number(value);
                if (Number.isFinite(numericValue) && numericValue < 0) return;
            }
        }
        
        setFormData(prev => ({ ...prev, [name]: finalValue }));
        if(hasError(name)) clearError(name);
    };

    // --- CRUD MODALS ---
    const handleOpenCrud = (type: 'MARCA' | 'MODELO', action: 'ADD' | 'EDIT') => {
        if (action === 'EDIT') {
            if (type === 'MARCA' && !selectedMarca) return toast.warning("Seleccione una marca para editar");
            if (type === 'MODELO' && !formData.modeloId) return toast.warning("Seleccione un modelo para editar");
            
            const idToEdit = type === 'MARCA' ? Number(selectedMarca) : Number(formData.modeloId);
            const list = catalogs[type === 'MARCA' ? 'Marca' : 'Modelo'];
            const item = list?.find(x => Number(x.value) === idToEdit);
            
            setCrudModal({ type, action, data: { id: idToEdit, descripcion: item?.label } });
        } else {
            if (type === 'MODELO' && !selectedMarca) return toast.warning("Seleccione una marca primero");
            setCrudModal({ type, action, data: null });
        }
    };

    // Refrescar combos cuando se inserta o edita desde el Modal CRUD
    const handleCrudSuccess = () => {
        refreshCatalogs(); // Llamamos al nuevo método del hook
    };

    // --- BÚSQUEDA EXTERNA ---
    const handlePlacaFound = (data: PlacaVehiculoResponse) => {
        let foundMarcaId = "";
        if (data.marca && catalogs['Marca']) {
            const marcaText = data.marca.trim().toUpperCase();
            const marcaMatch = catalogs['Marca'].find(m => m.label.trim().toUpperCase() === marcaText);
            if (marcaMatch) foundMarcaId = String(marcaMatch.value);
        }

        let foundModeloId = "";
        if (foundMarcaId && data.modelo && catalogs['Modelo']) {
            const modeloText = data.modelo.trim().toUpperCase();
            const modeloMatch = catalogs['Modelo'].find(m => 
                String(m.groupKey) === foundMarcaId && m.label.trim().toUpperCase() === modeloText
            );
            if (modeloMatch) foundModeloId = String(modeloMatch.value);
        }

        const descAuto = `${data.marca || ''} ${data.modelo || ''} - ${data.placa || ''}`.trim();
        setSelectedMarca(foundMarcaId);
        
        setFormData(prev => ({
            ...prev,
            nro_matricula_cabina: String(data.placa || prev.nro_matricula_cabina || '').toUpperCase(),
            descripcion: String(prev.descripcion || descAuto || '').toUpperCase(),
            modeloId: foundModeloId,
            observaciones: `COLOR: ${data.color || '-'} | MOTOR: ${data.motor || '-'} | VIN: ${data.vin || '-'}`
        }));

        if(descAuto) clearError('descripcion');
        if(foundModeloId) clearError('modeloId');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        resetErrors();

        if (!String(formData.nro_matricula_cabina || '').trim()) {
            addError('nro_matricula_cabina');
            return toast.error("Placa cabina es obligatoria.");
        }
        if (!String(formData.descripcion || '').trim()) {
            addError('descripcion');
            return toast.error("Descripción / nombre es obligatorio.");
        }
        if (!String(selectedMarca || '').trim()) {
            return toast.error("Marca es obligatoria.");
        }
        if (!String(formData.modeloId || '').trim()) {
            addError('modeloId');
            return toast.error("Modelo es obligatorio.");
        }

        const pesoValue = String(formData.peso_maximo ?? '').trim();
        if (!pesoValue) {
            addError('peso_maximo');
            return toast.error("Peso máximo es obligatorio.");
        }

        const pesoMaximoNum = Number(formData.peso_maximo);
        if (!Number.isFinite(pesoMaximoNum) || pesoMaximoNum < 0) {
            addError('peso_maximo');
            return toast.error("El peso máximo no puede ser negativo.");
        }

        setLoading(true);
        try {
            const payload = {
                ...formData,
                descripcion: String(formData.descripcion || '').trim().toUpperCase(),
                nro_matricula_cabina: String(formData.nro_matricula_cabina || '').trim().toUpperCase(),
                certificado_inscripcion: String(formData.certificado_inscripcion || '').trim().toUpperCase() || null,
                nro_matricula_carrosa1: String(formData.nro_matricula_carrosa1 || '').trim().toUpperCase() || null,
                nro_matricula_carrosa2: String(formData.nro_matricula_carrosa2 || '').trim().toUpperCase() || null,
                nro_matricula_carrosa3: String(formData.nro_matricula_carrosa3 || '').trim().toUpperCase() || null,
                modeloId: String(normalizeId(formData.modeloId) || ''),
                peso_maximo: pesoMaximoNum
            };
            if (unitToEdit?.unidadtransporteId) {
                await unidadTransporteService.update(unitToEdit.unidadtransporteId, payload);
                toast.success("Vehículo actualizado");
            } else {
                await unidadTransporteService.create(payload);
                toast.success("Vehículo registrado");
            }
            onSuccess();
            onClose();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || "Error al procesar");
        } finally {
            setLoading(false);
        }
    };

    const renderCrudButtons = (type: 'MARCA' | 'MODELO', disabled: boolean) => (
        <div className="flex gap-1 items-end pb-1">
            <button type="button" disabled={disabled || loadingCatalogs} onClick={() => handleOpenCrud(type, 'ADD')} className="p-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 disabled:opacity-30 transition-colors" title={`Agregar ${type.toLowerCase()}`}>
                <IconPlus size={16} />
            </button>
            <button type="button" disabled={disabled || loadingCatalogs || (type === 'MARCA' ? !selectedMarca : !formData.modeloId)} onClick={() => handleOpenCrud(type, 'EDIT')} className="p-1.5 bg-orange-50 text-orange-600 rounded hover:bg-orange-100 disabled:opacity-30 transition-colors" title={`Editar ${type.toLowerCase()}`}>
                <IconEdit size={16} />
            </button>
        </div>
    );

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} title={isReadOnly ? "Detalle Vehículo" : unitToEdit ? "Editar Vehículo" : "Nuevo Vehículo"} size="xl">
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                        <div className="md:col-span-1">
                             <ExternalSearchInput label="Placa Cabina" name="nro_matricula_cabina" value={formData.nro_matricula_cabina || ''} onChange={handleChange} onSuccess={handlePlacaFound} empresaId={EMPRESA_ID} type="PLACA" disabled={isReadOnly || isEditing || loadingCatalogs} placeholder="ABC-123" className="font-mono font-bold" error={hasError('nro_matricula_cabina')} />
                        </div>
                        <div className="md:col-span-2">
                            <ValidatedFormInput label="Descripción / Nombre" name="descripcion" value={formData.descripcion || ''} onChange={handleChange} disabled={isReadOnly} placeholder="Ej: VOLVO FH 500 BLANCO" error={hasError('descripcion')} />
                        </div>
                        <div className="flex gap-2 items-start">
                            <div className="flex-1">
                                <SearchableSelect label="Marca" name="marca" options={(catalogs['Marca'] || []).map(opt => ({ ...opt, key: String(opt.value), value: String(opt.value) }))} value={selectedMarca} onChange={handleMarcaChange} disabled={isReadOnly || loadingCatalogs} />
                            </div>
                            {!isReadOnly && renderCrudButtons('MARCA', false)}
                        </div>
                        <div className="flex gap-2 items-start">
                            <div className="flex-1">
                                <SearchableSelect label="Modelo" name="modeloId" options={filteredModelos.map(opt => ({ ...opt, key: String(opt.value), value: String(opt.value) }))} value={formData.modeloId || ''} onChange={handleChange} disabled={!selectedMarca || filteredModelos.length === 0 || isReadOnly || loadingCatalogs} placeholder={!selectedMarca ? "Seleccione marca..." : "Seleccione modelo"} />
                            </div>
                            {!isReadOnly && renderCrudButtons('MODELO', !selectedMarca)}
                        </div>
                        <ValidatedFormInput label="Peso Máximo (T)" name="peso_maximo" type="number" min="0" step="0.01" value={formData.peso_maximo ?? ''} onChange={handleChange} disabled={isReadOnly} error={hasError('peso_maximo')} />
                        <ValidatedFormInput label="Cert. Inscripción" name="certificado_inscripcion" value={formData.certificado_inscripcion || ''} onChange={handleChange} disabled={isReadOnly} />
                        <ValidatedFormInput label="Placa Carreta 1" name="nro_matricula_carrosa1" value={formData.nro_matricula_carrosa1 || ''} onChange={handleChange} disabled={isReadOnly} />
                        <ValidatedFormInput label="Placa Carreta 2" name="nro_matricula_carrosa2" value={formData.nro_matricula_carrosa2 || ''} onChange={handleChange} disabled={isReadOnly} />
                        <ValidatedFormInput label="Placa Carreta 3" name="nro_matricula_carrosa3" value={formData.nro_matricula_carrosa3 || ''} onChange={handleChange} disabled={isReadOnly} />
                        <div className="md:col-span-3">
                             <ValidatedFormInput label="Observaciones" name="observaciones" value={formData.observaciones || ''} onChange={handleChange} disabled={isReadOnly} />
                        </div>
                    </div>
                    {!isReadOnly && (
                        <div className="flex justify-end gap-3 pt-4 border-t mt-4">
                            <button type="button" onClick={onClose} className="px-6 py-2 text-slate-500 font-bold hover:bg-slate-50 rounded-lg transition-colors">Cancelar</button>
                            <button type="submit" disabled={loading || loadingCatalogs} className="bg-blue-600 text-white px-8 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50">
                                {loading ? <IconLoader className="animate-spin" size={20}/> : <IconDeviceFloppy size={20}/>}
                                {unitToEdit ? 'Guardar Cambios' : 'Registrar'}
                            </button>
                        </div>
                    )}
                </form>
            </Modal>

            {crudModal.type && (
                <SimpleCrudModal 
                    isOpen={!!crudModal.type}
                    onClose={() => setCrudModal({ type: null, action: null })}
                    onSuccess={handleCrudSuccess}
                    title={`${crudModal.action === 'ADD' ? 'Agregar' : 'Editar'} ${crudModal.type === 'MARCA' ? 'Marca' : 'Modelo'}`}
                    initialData={crudModal.data}
                    service={crudModal.type === 'MARCA' ? marcaService : modeloService}
                    extraData={crudModal.type === 'MODELO' ? { marcaId: Number(selectedMarca) } : {}}
                />
            )}
        </>
    );
}
