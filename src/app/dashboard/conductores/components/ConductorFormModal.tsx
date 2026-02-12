// src/app/dashboard/conductores/components/ConductorFormModal.tsx
"use client";
import { useState, useEffect } from 'react';
import { conductorService } from '@/services/conductorService';
import Modal from '@/components/ui/Modal';
import SearchableSelect from '@/components/forms/SearchableSelect';
import ExternalSearchInput from '@/components/forms/ExternalSearchInput'; 
import ValidatedFormInput from '@/components/forms/ValidatedFormInput';
import { IconDeviceFloppy, IconLoader, IconX } from '@tabler/icons-react';
import { toast } from 'sonner';
import { Conductor } from '@/types/conductor.types';
import { Licencia, LicenciaConducirResponse, RucResponse, CarnetExtranjeriaResponse } from '@/types/apiExternal.types';
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
    const [catalogs, setCatalogs] = useState<any>(null);
    const [licenciasEncontradas, setLicenciasEncontradas] = useState<Licencia[]>([]);

    const EMPRESA_ID = "005";
    const isReadOnly = conductorToEdit?.estado === false;
    const isEditing = !!conductorToEdit;

    const { hasError, clearError, validate, resetErrors } = useValidation();

    const initialState: Partial<Conductor> = {
        nombres: '', apellidos: '', docidentId: 'DNI', nro_documento: '',
        direccion: '', correo: '', ubidst: '', telefono_fijo: '',
        telefono_movil: '', licencia_conducir: '', empresaId: EMPRESA_ID
    };

    const [formData, setFormData] = useState<Partial<Conductor>>(initialState);

    useEffect(() => {
        if (isOpen) {
            resetErrors();
            setLicenciasEncontradas([]); 
            
            conductorService.getFormDropdowns().then(res => {
                if (res.isSuccess) setCatalogs(res.data);
            });

            if (conductorToEdit) {
                setFormData({ ...initialState, ...conductorToEdit });
            } else {
                setFormData(initialState);
            }
        }
    }, [isOpen, conductorToEdit]);

    const handleChange = (e: any) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (hasError(name)) clearError(name);
    };

    // Helper para separar nombres
    const parseNombreCompleto = (nombreCompleto: string) => {
        if (!nombreCompleto) return { nombres: '', apellidos: '' };
        const parts = nombreCompleto.trim().split(/\s+/);
        if (parts.length <= 2) {
            return { nombres: parts[0] || '', apellidos: parts.slice(1).join(' ') };
        }
        const apellidos = parts.slice(-2).join(' ');
        const nombres = parts.slice(0, -2).join(' ');
        return { nombres, apellidos };
    };

    // --- HANDLER DE BÚSQUEDA ROBUSTO ---
    const handleSearchSuccess = (data: any) => {
        // 1. LIMPIEZA TOTAL PREVIA
        // Reseteamos lista de licencias visuales
        setLicenciasEncontradas([]);
        
        // Variables temporales para el nuevo estado (inician vacías para limpiar basura anterior)
        let newNombres = '';
        let newApellidos = '';
        let newDireccion = '';
        let newLicenciaNumero = '';
        let foundLicencias: Licencia[] = [];

        // 2. PROCESAMIENTO SEGÚN TIPO DE RESPUESTA
        
        // A) RESPUESTA DE LICENCIA / DNI
        if ('licencia' in data && 'nombreCompleto' in data) {
            const info = data as LicenciaConducirResponse;
            const parsed = parseNombreCompleto(info.nombreCompleto);
            
            newNombres = parsed.nombres;
            newApellidos = parsed.apellidos;
            // A veces la API de licencia no trae dirección, pero si la trae, úsala.
            newDireccion = (data as any).direccion || ''; 

            if (info.licencia) foundLicencias = [info.licencia];
            // Si la API soporta múltiples: else if (data.licencias) foundLicencias = data.licencias;
        }
        // B) RESPUESTA DE RUC
        else if ('nombreORazonSocial' in data) {
            const info = data as RucResponse;
            const parsed = parseNombreCompleto(info.nombreORazonSocial);
            newNombres = parsed.nombres;
            newApellidos = parsed.apellidos;
            newDireccion = info.direccionCompleta || info.direccion || '';
            // RUC no trae licencias, así que foundLicencias se queda vacío []
        }
        // C) RESPUESTA DE CARNET EXTRANJERÍA / DNI SIMPLE
        else if ('nombres' in data) {
            // DNI Response simple o CEX
            newNombres = data.nombres;
            if (data.apellidoPaterno) {
                newApellidos = `${data.apellidoPaterno} ${data.apellidoMaterno}`;
            } else {
                newApellidos = `${data.apellido_paterno || ''} ${data.apellido_materno || ''}`;
            }
            newDireccion = data.direccionCompleta || data.direccion || '';
        }

        // 3. LÓGICA DE LICENCIA ENCONTRADA
        if (foundLicencias.length > 0) {
            setLicenciasEncontradas(foundLicencias);
            if (foundLicencias.length === 1) {
                newLicenciaNumero = foundLicencias[0].numero;
            } else {
                toast.info("Se encontraron múltiples licencias. Seleccione una.");
                // newLicenciaNumero se queda vacío para obligar al usuario a elegir del select
            }
        }

        // 4. ACTUALIZACIÓN ATÓMICA DEL ESTADO (Sobrescribe todo)
        setFormData(prev => ({
            ...prev,
            nombres: newNombres,
            apellidos: newApellidos,
            direccion: newDireccion,       // Se sobrescribe (se limpia si la nueva búsqueda no trajo dirección)
            licencia_conducir: newLicenciaNumero // Se sobrescribe (se limpia si la nueva búsqueda no es DNI)
        }));

        // Limpiamos los errores visuales de los campos llenados
        if (newNombres) clearError('nombres');
        if (newApellidos) clearError('apellidos');
        if (newLicenciaNumero) clearError('licencia_conducir');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const rules = {
            docidentId: formData.docidentId,
            nro_documento: formData.nro_documento,
            nombres: formData.nombres,
            apellidos: formData.apellidos,
            licencia_conducir: formData.licencia_conducir,
        };

        if (!validate(rules)) {
            toast.error("Complete los campos obligatorios resaltados en rojo.");
            return;
        }

        setLoading(true);
        try {
            if (conductorToEdit?.conductortransporteId) {
                await conductorService.update(conductorToEdit.conductortransporteId, formData);
                toast.success("Conductor actualizado correctamente");
            } else {
                await conductorService.create(formData);
                toast.success("Conductor registrado correctamente");
            }
            onSuccess();
            onClose();
        } catch (error) {
            toast.error("Error al procesar la solicitud");
        } finally {
            setLoading(false);
        }
    };

    const getSearchType = () => {
        const docType = formData.docidentId;
        if (docType === 'DNI') return 'LICENCIA'; 
        if (docType === 'RUC') return 'RUC';
        if (docType === 'CEX') return 'CARNET';
        return 'LICENCIA'; 
    };

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={isReadOnly ? "Detalle Conductor" : conductorToEdit ? "Editar Conductor" : "Nuevo Conductor"}
            size="lg"
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    
                    <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase">Tipo Doc. *</label>
                        <select
                            name="docidentId"
                            value={formData.docidentId || ''}
                            onChange={handleChange}
                            disabled={isReadOnly || isEditing}
                            className={getInputClasses(hasError('docidentId'), isReadOnly || isEditing)}
                        >
                            {catalogs?.documento_identidad?.map((opt: any) => (
                                <option key={opt.key} value={opt.key}>{opt.value}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                         <ExternalSearchInput
                            label="Nro. Documento"
                            name="nro_documento"
                            value={formData.nro_documento || ''}
                            onChange={handleChange}
                            onSuccess={handleSearchSuccess}
                            empresaId={EMPRESA_ID}
                            type={getSearchType()}
                            disabled={isReadOnly || isEditing}
                            required
                            error={hasError('nro_documento')}
                            errorText="Completa este campo"
                        /> 
                    </div>

                    <ValidatedFormInput 
                        label="Nombres" name="nombres" 
                        value={formData.nombres || ''} onChange={handleChange} 
                        required disabled={isReadOnly} error={hasError('nombres')}
                    />
                    
                    <ValidatedFormInput 
                        label="Apellidos" name="apellidos" 
                        value={formData.apellidos || ''} onChange={handleChange} 
                        required disabled={isReadOnly} error={hasError('apellidos')}
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
                                errorText="Completa este campo"
                            />
                        )}
                    </div>

                    <ValidatedFormInput 
                        label="Teléfono Móvil" name="telefono_movil" 
                        value={formData.telefono_movil || ''} onChange={handleChange} 
                        disabled={isReadOnly} 
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