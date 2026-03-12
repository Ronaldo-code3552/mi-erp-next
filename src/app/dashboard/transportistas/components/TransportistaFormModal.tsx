// src/app/dashboard/transportistas/components/TransportistaFormModal.tsx
"use client";
import { useState, useEffect } from 'react';
import { transportistaService } from '@/services/transportistaService';
import { useCatalogs } from '@/hooks/useCatalogs'; // Nuevo hook importado
import Modal from '@/components/ui/Modal';
import SearchableSelect from '@/components/forms/SearchableSelect';
import ExternalSearchInput from '@/components/forms/ExternalSearchInput'; 
import { IconDeviceFloppy, IconLoader } from '@tabler/icons-react';
import { toast } from 'sonner';
import { Transportista } from '@/types/transportista.types';
import { RucResponse, DniResponse } from '@/types/apiExternal.types';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    transportistaToEdit?: Transportista | null;
}

// --- COMPONENTE AUXILIAR ---
const FormInput = ({ label, className, ...props }: any) => (
    <div className="flex flex-col gap-1.5 text-left w-full">
        <label className="text-xs font-bold text-slate-500 uppercase">{label}</label>
        <input 
            className={`w-full border border-slate-200 p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400 transition-all uppercase ${className || ''}`} 
            {...props} 
        />
    </div>
);

// --- COMPONENTE PRINCIPAL ---
export default function TransportistaFormModal({ isOpen, onClose, onSuccess, transportistaToEdit }: Props) {
    const [loading, setLoading] = useState(false);

    const EMPRESA_ID = "005"; 
    const isReadOnly = !!(transportistaToEdit && transportistaToEdit.estado === false);
    const isEditing = !!transportistaToEdit;

    const initialState: Partial<Transportista> = {
        descripcion: '', 
        direccion: '', 
        docidentId: '6', // '6' = RUC por defecto (o '06' dependiendo de tu BD)
        numero_doc: '',
        empresaId: EMPRESA_ID
    };

    const [formData, setFormData] = useState<Partial<Transportista>>(initialState);

    // Cargar Catálogos dinámicamente solo si el modal está abierto
    const { catalogs, loadingCatalogs } = useCatalogs(isOpen ? ['DocumentoIdentidadXcore'] : []);

    const mapToFormData = (source: any): Partial<Transportista> => {
        const docidentValue = source?.docidentId ?? source?.docIdentId ?? '6';
        const numeroDocValue = source?.numero_doc ?? source?.numeroDoc ?? '';
        const descripcionValue = source?.descripcion ?? source?.razonSocial ?? '';
        const direccionValue = source?.direccion ?? '';

        return {
            ...source,
            descripcion: descripcionValue,
            direccion: direccionValue,
            docidentId: String(docidentValue).trim(),
            numero_doc: numeroDocValue,
            empresaId: EMPRESA_ID
        };
    };

    // 1. Cargar Datos del Transportista a Editar
    useEffect(() => {
        if (isOpen) {
            if (transportistaToEdit) {
                setFormData(mapToFormData(transportistaToEdit));

                if (transportistaToEdit.transportistaId) {
                    transportistaService.getById(transportistaToEdit.transportistaId)
                        .then((res) => {
                            if (res?.isSuccess && res?.data) {
                                setFormData(mapToFormData(res.data));
                            }
                        })
                        .catch(() => {
                            // Mantiene el prellenado por props si falla
                        });
                }
            } else {
                setFormData(initialState);
            }
        }
    }, [isOpen, transportistaToEdit]);

    useEffect(() => {
        if (!isOpen || isEditing) return;

        const docOptions = catalogs['DocumentoIdentidadXcore'] || [];
        if (docOptions.length === 0) return;

        const currentValue = String(formData.docidentId || '').trim();
        const exists = docOptions.some((opt: any) => String(opt.value).trim() === currentValue);
        if (exists) return;

        const preferredOption =
            docOptions.find((opt: any) => {
                const aux = String(opt.aux || '').toUpperCase().trim();
                const label = String(opt.label || '').toUpperCase().trim();
                return aux.includes('RUC') || label.includes('RUC');
            }) || docOptions[0];

        if (preferredOption?.value) {
            setFormData(prev => ({ ...prev, docidentId: String(preferredOption.value).trim() }));
        }
    }, [isOpen, isEditing, catalogs, formData.docidentId]);

    // Lógica para auto-seleccionar el tipo de documento si no coincide exactamente por key
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

    // 2. Manejo de cambios en inputs normales
    const handleChange = (e: any) => {
        const { name, value } = e.target;
        const normalizedValue =
            name === 'descripcion' || name === 'direccion'
                ? String(value || '').toUpperCase()
                : value;

        setFormData(prev => ({ ...prev, [name]: normalizedValue }));
    };

    // 3. Lógica inteligente al encontrar datos en SUNAT/RENIEC
    const handleDataFound = (data: any) => {
        if ('nombreORazonSocial' in data) {
            const rucData = data as RucResponse;
            setFormData(prev => ({
                ...prev,
                descripcion: rucData.nombreORazonSocial,
                direccion: rucData.direccionCompleta || rucData.direccion || ''
            }));
        } 
        else if ('nombreCompleto' in data) {
            const dniData = data as DniResponse;
            setFormData(prev => ({
                ...prev,
                descripcion: dniData.nombreCompleto,
                direccion: dniData.direccion || '' 
            }));
        }
    };

    // 4. Guardar
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const docOptions = catalogs['DocumentoIdentidadXcore'] || [];
        const normalizedDocidentId = String(formData.docidentId || '').trim();
        const selectedDocExists = docOptions.some((opt: any) => String(opt.value).trim() === normalizedDocidentId);

        if (!normalizedDocidentId || !selectedDocExists) {
            return toast.error("Tipo de documento es obligatorio.");
        }
        if (!String(formData.numero_doc || '').trim()) {
            return toast.error("Número de documento es obligatorio.");
        }
        if (!String(formData.descripcion || '').trim()) {
            return toast.error("Razón social / nombre es obligatorio.");
        }

        setLoading(true);
        try {
            const payload = {
                ...formData,
                descripcion: String(formData.descripcion || '').trim().toUpperCase(),
                direccion: String(formData.direccion || '').trim().toUpperCase(),
                docidentId: normalizedDocidentId,
                numero_doc: String(formData.numero_doc || '').trim(),
                empresaId: EMPRESA_ID
            };

            if (transportistaToEdit?.transportistaId) {
                await transportistaService.update(transportistaToEdit.transportistaId, payload);
                toast.success("Transportista actualizado correctamente");
            } else {
                await transportistaService.create(payload);
                toast.success("Transportista registrado correctamente");
            }
            onSuccess();
            onClose();
        } catch (error: any) {
            const rawMessage = String(error?.response?.data?.message || '');
            const message = rawMessage.toLowerCase().includes('número de documento ya se encuentra registrado para un transportista')
                ? 'El número de documento ya está registrado para un transportista.'
                : rawMessage || "Error al procesar la solicitud";
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    // Helper para determinar el tipo de búsqueda (DNI, RUC, CARNET) según la abreviatura (aux) del catálogo
    const getSearchType = () => {
        const docOptions = catalogs['DocumentoIdentidadXcore'] || [];
        const selectedDoc = docOptions.find(opt => String(opt.value).trim() === String(formData.docidentId).trim());
        const auxValue = String(selectedDoc?.aux || '').toUpperCase();

        if (auxValue.includes('DNI') || formData.docidentId === '1') return 'DNI';
        if (auxValue.includes('CEX') || auxValue.includes('CARNET') || formData.docidentId === '4') return 'CARNET';
        return 'RUC'; // Por defecto
    };

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={isReadOnly ? "Detalle Transportista" : transportistaToEdit ? "Editar Transportista" : "Nuevo Transportista"}
            size="lg"
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    
                    {/* SELECCIONAR TIPO DOCUMENTO */}
                    <SearchableSelect 
                        label="Tipo Doc." 
                        name="docidentId" 
                        options={(catalogs['DocumentoIdentidadXcore'] || []).map((opt: any) => ({
                            key: String(opt.value),
                            value: opt.value,
                            label: opt.label,
                            aux: opt.aux
                        }))} 
                        value={formData.docidentId || ''} 
                        onChange={handleChange} 
                        disabled={isReadOnly || isEditing || loadingCatalogs}
                    />

                    {/* INPUT INTELIGENTE DE BÚSQUEDA */}
                    <ExternalSearchInput
                        label="Número Documento"
                        name="numero_doc"
                        value={formData.numero_doc || ''}
                        onChange={handleChange}
                        onSuccess={handleDataFound}
                        empresaId={EMPRESA_ID}
                        type={getSearchType()}
                        disabled={isReadOnly || isEditing || loadingCatalogs || !formData.docidentId}
                        required
                        className="font-mono" 
                    />

                    {/* RAZÓN SOCIAL */}
                    <div className="md:col-span-2">
                        <FormInput 
                            label="Razón Social / Nombre" 
                            name="descripcion" 
                            value={formData.descripcion || ''} 
                            onChange={handleChange} 
                            required 
                            disabled={isReadOnly} 
                            placeholder="Ej: TRANSPORTES SAC" 
                        />
                    </div>
                    
                    {/* DIRECCIÓN */}
                    <div className="md:col-span-2">
                        <FormInput 
                            label="Dirección Legal" 
                            name="direccion" 
                            value={formData.direccion || ''} 
                            onChange={handleChange} 
                            disabled={isReadOnly} 
                        />
                    </div>
                </div>

                {/* BOTONES */}
                {!isReadOnly && (
                    <div className="flex justify-end gap-3 pt-4 border-t mt-4">
                        <button type="button" onClick={onClose} className="px-6 py-2 text-slate-500 font-bold hover:bg-slate-50 rounded-lg transition-colors">Cancelar</button>
                        <button type="submit" disabled={loading || loadingCatalogs} className="bg-blue-600 text-white px-8 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50">
                            {loading ? <IconLoader className="animate-spin" size={20}/> : <IconDeviceFloppy size={20}/>}
                            {transportistaToEdit ? 'Guardar Cambios' : 'Registrar'}
                        </button>
                    </div>
                )}
            </form>
        </Modal>
    );
}
