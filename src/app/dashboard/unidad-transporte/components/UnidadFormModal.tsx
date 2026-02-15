// src/app/dashboard/unidad-transporte/components/UnidadFormModal.tsx
"use client";
import { useState, useEffect } from 'react';
import { unidadTransporteService } from '@/services/unidadTransporteService';
import { marcaService } from '@/services/marcaService';
import { modeloService } from '@/services/modeloService';
import Modal from '@/components/ui/Modal';
import SearchableSelect from '@/components/forms/SearchableSelect';
import ExternalSearchInput from '@/components/forms/ExternalSearchInput';
import ValidatedFormInput from '@/components/forms/ValidatedFormInput'; 
import SimpleCrudModal from '@/components/forms/SimpleCrudModal';
import { IconDeviceFloppy, IconLoader, IconPlus, IconEdit } from '@tabler/icons-react'; // Se quitó IconTrash
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
    
    // Catálogos locales
    const [catalogs, setCatalogs] = useState<{ marca: any[], modelo: any[] } | null>(null);
    
    const EMPRESA_ID = "005";

    // Estados
    const [selectedMarca, setSelectedMarca] = useState("");
    const [filteredModelos, setFilteredModelos] = useState<any[]>([]);
    
    // Estados para Modales CRUD
    const [crudModal, setCrudModal] = useState<{ type: 'MARCA' | 'MODELO' | null, action: 'ADD' | 'EDIT' | null, data?: any }>({ type: null, action: null });

    const isReadOnly = !!(unitToEdit && unitToEdit.estado === "0");
    const { hasError, clearError, validate, resetErrors } = useValidation();

    const initialState: Partial<UnidadTransporte> = {
        descripcion: '', nro_matricula_cabina: '', modeloId: '', peso_maximo: 0,
        certificado_inscripcion: '', nro_matricula_carrosa1: '', nro_matricula_carrosa2: '',
        observaciones: '', empresaId: EMPRESA_ID, estado: '1'
    };

    const [formData, setFormData] = useState<Partial<UnidadTransporte>>(initialState);

    // 1. CARGA INICIAL
    useEffect(() => {
        if (isOpen) {
            resetErrors();
            loadCatalogs(); 

            if (unitToEdit) {
                setFormData(unitToEdit);
                if (unitToEdit.modelo?.marcaId) {
                    setSelectedMarca(String(unitToEdit.modelo.marcaId));
                }
            } else {
                setFormData(initialState);
                setSelectedMarca("");
            }
        }
    }, [isOpen, unitToEdit]);

    // Función para recargar catálogos completos
    const loadCatalogs = () => {
        unidadTransporteService.getFormDropdowns().then(res => {
            if (res.isSuccess) setCatalogs(res.data);
        });
    };

    // 2. FILTRADO DE MODELOS
    useEffect(() => {
        if (selectedMarca && catalogs?.modelo) {
            const filtrados = catalogs.modelo.filter(
                (m: any) => String(m.groupKey || m.marcaId) === String(selectedMarca)
            );
            setFilteredModelos(filtrados);
        } else {
            setFilteredModelos([]);
        }
    }, [selectedMarca, catalogs]);

    const handleMarcaChange = (e: any) => {
        const newMarcaId = e.target.value;
        setSelectedMarca(newMarcaId);
        setFormData(prev => ({ ...prev, modeloId: '' })); 
    };

    const handleChange = (e: any) => {
        const { name, value } = e.target;
        let finalValue = value;
        if (name === 'nro_matricula_cabina') finalValue = value.toUpperCase();
        
        setFormData(prev => ({ ...prev, [name]: finalValue }));
        if(hasError(name)) clearError(name);
    };

    // --- MANEJO DE CRUD MARCA/MODELO (Solo Add/Edit) ---
    const handleOpenCrud = (type: 'MARCA' | 'MODELO', action: 'ADD' | 'EDIT') => {
        if (action === 'EDIT') {
            if (type === 'MARCA' && !selectedMarca) return toast.warning("Seleccione una marca para editar");
            if (type === 'MODELO' && !formData.modeloId) return toast.warning("Seleccione un modelo para editar");
            
            const idToEdit = type === 'MARCA' ? Number(selectedMarca) : Number(formData.modeloId);
            
            // Buscar la descripción actual en los catálogos para precargar el modal
            const list = type === 'MARCA' ? catalogs?.marca : catalogs?.modelo;
            const item = list?.find((x: any) => Number(x.key) === idToEdit);
            
            setCrudModal({ type, action, data: { id: idToEdit, descripcion: item?.value } });
        } else {
            // ADD
            if (type === 'MODELO' && !selectedMarca) return toast.warning("Seleccione una marca primero");
            setCrudModal({ type, action, data: null });
        }
    };

    const handleCrudSuccess = () => {
        loadCatalogs(); // Recargar dropdowns para ver los cambios
    };

    // --- LÓGICA DE BÚSQUEDA DE PLACA (Igual que antes) ---
    const handlePlacaFound = (data: PlacaVehiculoResponse) => {
        let foundMarcaId = "";
        if (data.marca && catalogs?.marca) {
            const marcaText = data.marca.trim().toUpperCase();
            const marcaMatch = catalogs.marca.find((m: any) => m.value.trim().toUpperCase() === marcaText);
            if (marcaMatch) foundMarcaId = String(marcaMatch.key);
        }

        let foundModeloId = "";
        if (foundMarcaId && data.modelo && catalogs?.modelo) {
            const modeloText = data.modelo.trim().toUpperCase();
            const modeloMatch = catalogs.modelo.find((m: any) => 
                String(m.groupKey) === foundMarcaId && 
                m.value.trim().toUpperCase() === modeloText
            );
            if (modeloMatch) foundModeloId = String(modeloMatch.key);
        }

        const descAuto = `${data.marca || ''} ${data.modelo || ''} - ${data.placa || ''}`.trim();

        setSelectedMarca(foundMarcaId);
        
        setFormData(prev => ({
            ...prev,
            nro_matricula_cabina: data.placa || prev.nro_matricula_cabina,
            descripcion: prev.descripcion || descAuto,
            modeloId: foundModeloId,
            observaciones: `COLOR: ${data.color || '-'} | MOTOR: ${data.motor || '-'} | VIN: ${data.vin || '-'}`
        }));

        if(descAuto) clearError('descripcion');
        if(foundModeloId) clearError('modeloId');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const rules = {
            descripcion: formData.descripcion,
            nro_matricula_cabina: formData.nro_matricula_cabina,
            modeloId: formData.modeloId
        };

        if(!selectedMarca) return toast.error("Seleccione una marca");
        if (!validate(rules)) return toast.error("Complete los campos obligatorios");

        setLoading(true);
        try {
            if (unitToEdit?.unidadtransporteId) {
                await unidadTransporteService.update(unitToEdit.unidadtransporteId, formData);
                toast.success("Vehículo actualizado");
            } else {
                await unidadTransporteService.create(formData);
                toast.success("Vehículo registrado");
            }
            onSuccess();
            onClose();
        } catch (error) {
            toast.error("Error al procesar");
        } finally {
            setLoading(false);
        }
    };

    // --- RENDERIZADO DE BOTONES CRUD (SIN DELETE) ---
    const renderCrudButtons = (type: 'MARCA' | 'MODELO', disabled: boolean) => (
        <div className="flex gap-1 items-end pb-1">
            <button type="button" disabled={disabled} onClick={() => handleOpenCrud(type, 'ADD')} className="p-1.5 bg-blue-50 text-blue-600 rounded hover:bg-blue-100 disabled:opacity-30 transition-colors" title={`Agregar ${type.toLowerCase()}`}>
                <IconPlus size={16} />
            </button>
            <button type="button" disabled={disabled || (type === 'MARCA' ? !selectedMarca : !formData.modeloId)} onClick={() => handleOpenCrud(type, 'EDIT')} className="p-1.5 bg-orange-50 text-orange-600 rounded hover:bg-orange-100 disabled:opacity-30 transition-colors" title={`Editar ${type.toLowerCase()}`}>
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
                             <ExternalSearchInput
                                label="Placa Cabina" name="nro_matricula_cabina"
                                value={formData.nro_matricula_cabina || ''} onChange={handleChange}
                                onSuccess={handlePlacaFound} empresaId={EMPRESA_ID}
                                type="PLACA" disabled={isReadOnly} required
                                placeholder="ABC-123" className="font-mono font-bold"
                                error={hasError('nro_matricula_cabina')}
                            />
                        </div>

                        <div className="md:col-span-2">
                            <ValidatedFormInput 
                                label="Descripción / Nombre" name="descripcion" 
                                value={formData.descripcion || ''} onChange={handleChange} 
                                required disabled={isReadOnly} placeholder="Ej: VOLVO FH 500 BLANCO" 
                                error={hasError('descripcion')}
                            />
                        </div>

                        {/* --- SECCIÓN MARCA (CON CRUD: ADD/EDIT) --- */}
                        <div className="flex gap-2 items-start">
                            <div className="flex-1">
                                <SearchableSelect 
                                    label="Marca" name="marca" options={catalogs?.marca} 
                                    value={selectedMarca} onChange={handleMarcaChange} disabled={isReadOnly}
                                />
                            </div>
                            {!isReadOnly && renderCrudButtons('MARCA', false)}
                        </div>

                        {/* --- SECCIÓN MODELO (CON CRUD: ADD/EDIT) --- */}
                        <div className="flex gap-2 items-start">
                            <div className="flex-1">
                                <SearchableSelect 
                                    label="Modelo" name="modeloId" options={filteredModelos} 
                                    value={formData.modeloId || ''} onChange={handleChange}
                                    disabled={!selectedMarca || filteredModelos.length === 0 || isReadOnly}
                                    placeholder={!selectedMarca ? "Seleccione marca..." : "Seleccione modelo"}
                                />
                            </div>
                            {!isReadOnly && renderCrudButtons('MODELO', !selectedMarca)}
                        </div>

                        <ValidatedFormInput label="Peso Máximo (KG)" name="peso_maximo" type="number" value={formData.peso_maximo || 0} onChange={handleChange} disabled={isReadOnly} />
                        <ValidatedFormInput label="Cert. Inscripción" name="certificado_inscripcion" value={formData.certificado_inscripcion || ''} onChange={handleChange} disabled={isReadOnly} />
                        <ValidatedFormInput label="Placa Carreta 1" name="nro_matricula_carrosa1" value={formData.nro_matricula_carrosa1 || ''} onChange={handleChange} disabled={isReadOnly} />
                        <ValidatedFormInput label="Placa Carreta 2" name="nro_matricula_carrosa2" value={formData.nro_matricula_carrosa2 || ''} onChange={handleChange} disabled={isReadOnly} />

                        <div className="md:col-span-3">
                             <ValidatedFormInput label="Observaciones" name="observaciones" value={formData.observaciones || ''} onChange={handleChange} disabled={isReadOnly} />
                        </div>
                    </div>

                    {!isReadOnly && (
                        <div className="flex justify-end gap-3 pt-4 border-t mt-4">
                            <button type="button" onClick={onClose} className="px-6 py-2 text-slate-500 font-bold hover:bg-slate-50 rounded-lg transition-colors">Cancelar</button>
                            <button type="submit" disabled={loading} className="bg-blue-600 text-white px-8 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50">
                                {loading ? <IconLoader className="animate-spin" size={20}/> : <IconDeviceFloppy size={20}/>}
                                {unitToEdit ? 'Guardar Cambios' : 'Registrar'}
                            </button>
                        </div>
                    )}
                </form>
            </Modal>

            {/* --- MODAL AUXILIAR PARA CRUD --- */}
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