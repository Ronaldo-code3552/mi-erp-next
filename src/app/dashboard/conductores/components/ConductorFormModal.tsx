// src/app/dashboard/conductores/components/ConductorFormModal.tsx
"use client";
import { useState, useEffect } from 'react';
import { conductorService } from '@/services/conductorService';
import { useCatalogs } from '@/hooks/useCatalogs'; // 🚀 NUEVO HOOK
import Modal from '@/components/ui/Modal';
// Eliminamos SearchableSelect porque aquí usas un <select> nativo para el documento
import ExternalSearchInput from '@/components/forms/ExternalSearchInput'; 
import ValidatedFormInput from '@/components/forms/ValidatedFormInput';
import { IconDeviceFloppy, IconLoader, IconX } from '@tabler/icons-react';
import { toast } from 'sonner';
import { Conductor } from '@/types/conductor.types';
import { DniResponse, Licencia, LicenciaConducirResponse, RucResponse } from '@/types/apiExternal.types';
import { useValidation } from '@/hooks/useValidation';
import { getInputClasses } from '@/utils/formStyles';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    conductorToEdit?: Conductor | null;
}

export default function ConductorFormModal({ isOpen, onClose, onSuccess, conductorToEdit }: Props) {
    const [loading, setLoading] = useState(false);
    const [licenciasEncontradas, setLicenciasEncontradas] = useState<Licencia[]>([]);

    const EMPRESA_ID = "005";
    const isReadOnly = conductorToEdit?.estado === false;
    const isEditing = !!conductorToEdit;

    const { hasError, addError, clearError, resetErrors } = useValidation();

    // 🚀 Lazy Load del catálogo de Documentos
    const { catalogs, loadingCatalogs } = useCatalogs(isOpen ? ['DocumentoIdentidadXcore'] : []);

    const initialState: Partial<Conductor> = {
        nombres: '', apellidos: '', docidentId: '1', nro_documento: '', // '1' = DNI por defecto
        direccion: '', correo: '', ubidst: '', telefono_fijo: '',
        telefono_movil: '', licencia_conducir: '', empresaId: EMPRESA_ID
    };

    const [formData, setFormData] = useState<Partial<Conductor>>(initialState);

    useEffect(() => {
        if (isOpen) {
            resetErrors();
            setLicenciasEncontradas([]); 
            
            // 🧹 ELIMINADO: conductorService.getFormDropdowns()

            if (conductorToEdit) {
                setFormData({
                    ...initialState,
                    ...conductorToEdit,
                    nombres: String(conductorToEdit.nombres || '').toUpperCase(),
                    apellidos: String(conductorToEdit.apellidos || '').toUpperCase(),
                    telefono_movil: String(conductorToEdit.telefono_movil || '').replace(/\D/g, ''),
                });
            } else {
                setFormData(initialState);
            }
        }
    }, [isOpen, conductorToEdit]);

    // 🚀 Auto-selección inteligente si el docidentId no coincide exactamente (Ej. 'DNI' vs '1')
    useEffect(() => {
        const currentDocId = formData.docidentId;
        const docOptions = catalogs['DocumentoIdentidadXcore'];
        
        if (!isOpen || !currentDocId || !Array.isArray(docOptions) || docOptions.length === 0) return;

        const existsByKey = docOptions.some(opt => String(opt.value).trim() === String(currentDocId).trim());
        if (existsByKey) return;

        const currentUpper = String(currentDocId).toUpperCase().trim();
        const matched = docOptions.find(opt => {
            const keyU = String(opt.value || '').toUpperCase().trim();
            const labelU = String(opt.label || '').toUpperCase().trim();
            const auxU = String(opt.aux || '').toUpperCase().trim();
            return keyU === currentUpper || labelU === currentUpper || auxU === currentUpper;
        });

        if (matched?.value) {
            setFormData(prev => ({ ...prev, docidentId: String(matched.value).trim() }));
        }
    }, [isOpen, catalogs, formData.docidentId]);

    const handleChange = (e: any) => {
        const { name, value } = e.target;
        let nextValue = value;

        if (name === 'nombres' || name === 'apellidos') {
            nextValue = String(value || '').toUpperCase();
        }

        if (name === 'telefono_movil') {
            nextValue = String(value || '').replace(/\D/g, '');
        }

        if (name === 'telefono_fijo') {
            nextValue = String(value || '').replace(/\D/g, '');
        }

        setFormData(prev => ({ ...prev, [name]: nextValue }));
        if (hasError(name)) clearError(name);
    };

    const parseNombreCompleto = (nombreCompleto: string) => {
        const limpio = String(nombreCompleto || '').trim().replace(/\s+/g, ' ');
        if (!limpio) return { nombres: '', apellidos: '' };

        const partes = limpio.split(' ');
        if (partes.length === 1) {
            return { nombres: partes[0].toUpperCase(), apellidos: '' };
        }

        if (partes.length === 2) {
            return {
                nombres: partes[0].toUpperCase(),
                apellidos: partes[1].toUpperCase()
            };
        }

        return {
            nombres: partes.slice(0, -2).join(' ').toUpperCase(),
            apellidos: partes.slice(-2).join(' ').toUpperCase()
        };
    };

    const handleSearchSuccess = (data: DniResponse | RucResponse | LicenciaConducirResponse) => {
        const clearedFields = {
            nombres: '',
            apellidos: '',
            licencia_conducir: '',
            telefono_fijo: '',
            telefono_movil: '',
            correo: '',
            direccion: ''
        };

        if ('licencia' in data) {
            const licenciaData = data as LicenciaConducirResponse;
            const parsed = parseNombreCompleto(licenciaData.nombreCompleto);
            const licencias = licenciaData.licencia ? [licenciaData.licencia] : [];

            setLicenciasEncontradas(licencias);
            setFormData(prev => ({
                ...prev,
                ...clearedFields,
                nombres: parsed.nombres,
                apellidos: parsed.apellidos,
                licencia_conducir: licenciaData.licencia?.numero || ''
            }));
            return;
        }

        if ('nombreCompleto' in data) {
            const dniData = data as DniResponse;
            const parsed = parseNombreCompleto(dniData.nombreCompleto);

            setFormData(prev => ({
                ...prev,
                ...clearedFields,
                nombres: parsed.nombres,
                apellidos: parsed.apellidos,
                direccion: dniData.direccionCompleta || dniData.direccion || ''
            }));
            return;
        }

        if ('nombreORazonSocial' in data) {
            const rucData = data as RucResponse;
            const parsed = parseNombreCompleto(rucData.nombreORazonSocial);

            setFormData(prev => ({
                ...prev,
                ...clearedFields,
                nombres: parsed.nombres,
                apellidos: parsed.apellidos,
                direccion: rucData.direccionCompleta || rucData.direccion || ''
            }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const payload: Partial<Conductor> = {
            ...formData,
            nombres: String(formData.nombres || '').trim().toUpperCase(),
            apellidos: String(formData.apellidos || '').trim().toUpperCase(),
            docidentId: String(formData.docidentId || '').trim(),
            nro_documento: String(formData.nro_documento || '').trim(),
            direccion: String(formData.direccion || '').trim(),
            correo: String(formData.correo || '').trim() || null as any,
            ubidst: null as any,
            telefono_fijo: String(formData.telefono_fijo || '').replace(/\D/g, '') || null as any,
            telefono_movil: String(formData.telefono_movil || '').replace(/\D/g, '') || null as any,
            licencia_conducir: String(formData.licencia_conducir || '').trim(),
            empresaId: EMPRESA_ID
        };

        resetErrors();

        if (!String(payload.docidentId || '').trim()) {
            addError('docidentId');
            return toast.error('Tipo de documento es obligatorio.');
        }
        if (!String(payload.nro_documento || '').trim()) {
            addError('nro_documento');
            return toast.error('Número de documento es obligatorio.');
        }
        if (!String(payload.nombres || '').trim()) {
            addError('nombres');
            return toast.error('Nombres es obligatorio.');
        }
        if (!String(payload.apellidos || '').trim()) {
            addError('apellidos');
            return toast.error('Apellidos es obligatorio.');
        }
        if (!String(payload.licencia_conducir || '').trim()) {
            addError('licencia_conducir');
            return toast.error('Licencia de conducir es obligatoria.');
        }
        if (!String(payload.direccion || '').trim()) {
            addError('direccion');
            return toast.error('Dirección es obligatoria.');
        }

        setLoading(true);
        try {
            if (conductorToEdit?.conductortransporteId) {
                await conductorService.update(conductorToEdit.conductortransporteId, payload);
                toast.success('Conductor actualizado correctamente');
            } else {
                await conductorService.create(payload);
                toast.success('Conductor registrado correctamente');
            }
            onSuccess();
            onClose();
        } catch (error: any) {
            const rawMessage = String(error?.response?.data?.message || '');
            const message = rawMessage.toLowerCase().includes('número de documento ya se encuentra registrado')
                ? 'El número de documento ya está registrado.'
                : rawMessage || 'Error al procesar la solicitud';
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    // 🚀 Determinamos qué API buscar basándonos en el catálogo, igual que en Transportistas
    const getSearchType = () => {
        const docOptions = catalogs['DocumentoIdentidadXcore'] || [];
        const selectedDoc = docOptions.find(opt => String(opt.value).trim() === String(formData.docidentId).trim());
        const auxValue = String(selectedDoc?.aux || '').toUpperCase();

        if (auxValue.includes('DNI') || formData.docidentId === '1') return 'LICENCIA'; 
        if (auxValue.includes('CEX') || auxValue.includes('CARNET') || formData.docidentId === '4') return 'CARNET';
        if (auxValue.includes('RUC') || formData.docidentId === '6') return 'RUC';
        
        return 'LICENCIA'; // Fallback
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={isReadOnly ? "Detalle Conductor" : conductorToEdit ? "Editar Conductor" : "Nuevo Conductor"} size="lg">
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    
                    {/* TIPO DE DOCUMENTO */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase">Tipo Doc. *</label>
                        <select
                            name="docidentId"
                            value={formData.docidentId || ''}
                            onChange={handleChange}
                            disabled={isReadOnly || isEditing || loadingCatalogs} // Protegemos mientras carga
                            className={getInputClasses(hasError('docidentId'), isReadOnly || isEditing || loadingCatalogs)}
                        >
                            <option value="">-- SELECCIONE --</option>
                            {/* 🚀 Usamos el catálogo estándar */}
                            {(catalogs['DocumentoIdentidadXcore'] || []).map((opt: any) => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                            ))}
                        </select>
                    </div>

                    {/* INPUT INTELIGENTE (Búsqueda API) */}
                    <div className="flex flex-col gap-1.5">
                         <ExternalSearchInput
                            label="Nro. Documento"
                            name="nro_documento"
                            value={formData.nro_documento || ''}
                            onChange={handleChange}
                            onSuccess={handleSearchSuccess}
                            empresaId={EMPRESA_ID}
                            type={getSearchType()} // 🚀 Tipo dinámico
                            disabled={isReadOnly || isEditing || loadingCatalogs || !formData.docidentId}
                            error={hasError('nro_documento')}
                        /> 
                    </div>

                    <ValidatedFormInput 
                        label="Nombres" name="nombres" 
                        value={formData.nombres || ''} onChange={handleChange} 
                        disabled={isReadOnly} error={hasError('nombres')}
                        className="uppercase"
                    />
                    
                    <ValidatedFormInput 
                        label="Apellidos" name="apellidos" 
                        value={formData.apellidos || ''} onChange={handleChange} 
                        disabled={isReadOnly} error={hasError('apellidos')}
                        className="uppercase"
                    />
                    
                    <div className="flex flex-col gap-1.5 w-full">
                        <label className={`text-xs font-bold uppercase flex justify-between ${hasError('licencia_conducir') ? 'text-red-500' : 'text-slate-500'}`}>
                            Licencia Conducir *
                            {!isReadOnly && licenciasEncontradas.length > 0 && (
                                <button 
                                    type="button" 
                                    onClick={() => { setLicenciasEncontradas([]); setFormData(p => ({...p, licencia_conducir: ''})) }}
                                    className="text-[10px] text-blue-600 hover:underline flex items-center gap-1"
                                >
                                    <IconX size={12}/> Manual
                                </button>
                            )}
                        </label>
                        
                        {licenciasEncontradas.length > 0 ? (
                            <select
                                className={getInputClasses(hasError('licencia_conducir'), isReadOnly, 'bg-blue-50 border-blue-200')}
                                value={formData.licencia_conducir || ''}
                                onChange={handleChange}
                                name="licencia_conducir"
                                disabled={isReadOnly}
                            >
                                <option value="">-- Seleccione --</option>
                                {licenciasEncontradas.map((lic, idx) => (
                                    <option key={idx} value={lic.numero}>
                                        {lic.numero} - {lic.categoria} ({lic.estado})
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <ValidatedFormInput
                                name="licencia_conducir"
                                value={formData.licencia_conducir || ''}
                                onChange={handleChange}
                                disabled={isReadOnly}
                                placeholder="Ej: Q12345678"
                                className="font-mono"
                                error={hasError('licencia_conducir')}
                            />
                        )}
                    </div>

                    <ValidatedFormInput 
                        label="Teléfono Móvil" name="telefono_movil" 
                        value={formData.telefono_movil || ''} onChange={handleChange} 
                        disabled={isReadOnly}
                        inputMode="numeric"
                        pattern="[0-9]*"
                    />

                    <ValidatedFormInput
                        label="Teléfono Fijo"
                        name="telefono_fijo"
                        value={formData.telefono_fijo || ''}
                        onChange={handleChange}
                        disabled={isReadOnly}
                        inputMode="numeric"
                        pattern="[0-9]*"
                    />

                    <ValidatedFormInput
                        label="Correo"
                        name="correo"
                        type="email"
                        value={formData.correo || ''}
                        onChange={handleChange}
                        disabled={isReadOnly}
                        placeholder="ejemplo@correo.com"
                    />
                    
                    <div className="md:col-span-2">
                        <ValidatedFormInput 
                            label="Dirección" name="direccion" 
                            value={formData.direccion || ''} onChange={handleChange} 
                            disabled={isReadOnly} error={hasError('direccion')}
                        />
                    </div>
                </div>

                {!isReadOnly && (
                    <div className="flex justify-end gap-3 pt-4 border-t mt-4">
                        <button type="button" onClick={onClose} className="px-6 py-2 text-slate-500 font-bold hover:bg-slate-50 rounded-lg transition-colors">Cancelar</button>
                        <button type="submit" disabled={loading} className="bg-blue-600 text-white px-8 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50">
                            {loading ? <IconLoader className="animate-spin" size={20}/> : <IconDeviceFloppy size={20}/>}
                            {conductorToEdit ? 'Guardar Cambios' : 'Registrar'}
                        </button>
                    </div>
                )}
            </form>
        </Modal>
    );
}
