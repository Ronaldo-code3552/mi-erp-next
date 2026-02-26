// src/app/dashboard/transportistas/components/TransportistaFormModal.tsx
"use client";
import { useState, useEffect } from 'react';
import { transportistaService } from '@/services/transportistaService';
import Modal from '@/components/ui/Modal';
import SearchableSelect from '@/components/forms/SearchableSelect';
import ExternalSearchInput from '@/components/forms/ExternalSearchInput'; 
import { IconDeviceFloppy, IconLoader } from '@tabler/icons-react';
import { toast } from 'sonner';
import { Transportista } from '@/types/transportista.types';
// Importamos tus nuevos tipos para usarlos en la respuesta
import { RucResponse, DniResponse } from '@/types/apiExternal.types';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    transportistaToEdit?: Transportista | null;
}

// --- COMPONENTE AUXILIAR (DEFINIDO AFUERA PARA EVITAR EL BUG DE FOCO) ---
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
    const [catalogs, setCatalogs] = useState<any>(null);

    const EMPRESA_ID = "005"; 
    const isReadOnly = !!(transportistaToEdit && transportistaToEdit.estado === false);

    const initialState: Partial<Transportista> = {
        descripcion: '', 
        direccion: '', 
        docidentId: '6', // '6' = RUC por defecto
        numero_doc: '',
        empresaId: EMPRESA_ID
    };

    const [formData, setFormData] = useState<Partial<Transportista>>(initialState);

    const mapToFormData = (source: any): Partial<Transportista> => {
        const docidentValue = source?.docidentId ?? source?.docIdentId ?? '6';
        const numeroDocValue = source?.numero_doc ?? source?.numeroDoc ?? '';
        const descripcionValue = source?.descripcion ?? source?.razonSocial ?? '';
        const direccionValue = source?.direccion ?? '';

        return {
            ...source,
            descripcion: descripcionValue,
            direccion: direccionValue,
            docidentId: docidentValue,
            numero_doc: numeroDocValue,
            empresaId: EMPRESA_ID
        };
    };

    // 1. Cargar Datos y Catálogos
    useEffect(() => {
        if (isOpen) {
            transportistaService.getFormDropdowns().then(res => {
                if (res.isSuccess) setCatalogs(res.data);
            });

            if (transportistaToEdit) {
                // 1) Pintado rápido con lo recibido por props
                setFormData(mapToFormData(transportistaToEdit));

                // 2) Fuente de verdad: refrescar por ID para asegurar autocompletado
                if (transportistaToEdit.transportistaId) {
                    transportistaService.getById(transportistaToEdit.transportistaId)
                        .then((res) => {
                            if (res?.isSuccess && res?.data) {
                                setFormData(mapToFormData(res.data));
                            }
                        })
                        .catch(() => {
                            // si falla, mantenemos el prellenado por props
                        });
                }
            } else {
                setFormData(initialState);
            }
        }
    }, [isOpen, transportistaToEdit]);

    useEffect(() => {
        const currentDocId = formData.docidentId;
        const docOptions = catalogs?.documento_identidad;
        if (!isOpen || !currentDocId || !Array.isArray(docOptions) || docOptions.length === 0) return;

        const existsByKey = docOptions.some((opt: any) => String(opt.key) === String(currentDocId));
        if (existsByKey) return;

        const currentUpper = String(currentDocId).toUpperCase();
        const matched = docOptions.find((opt: any) => {
            const keyU = String(opt.key || '').toUpperCase();
            const valueU = String(opt.value || '').toUpperCase();
            const auxU = String(opt.aux || '').toUpperCase();
            return keyU === currentUpper || valueU === currentUpper || auxU === currentUpper;
        });

        if (matched?.key) {
            setFormData((prev) => ({ ...prev, docidentId: String(matched.key) }));
        }
    }, [isOpen, catalogs, formData.docidentId]);

    // 2. Manejo de cambios en inputs normales
    const handleChange = (e: any) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // 3. Lógica inteligente al encontrar datos en SUNAT/RENIEC
    const handleDataFound = (data: any) => {
        // TypeScript: Verificamos propiedades para saber si es RUC o DNI
        
        // CASO RUC (RucResponse)
        if ('nombreORazonSocial' in data) {
            const rucData = data as RucResponse;
            setFormData(prev => ({
                ...prev,
                descripcion: rucData.nombreORazonSocial,
                direccion: rucData.direccionCompleta || rucData.direccion || ''
            }));
        } 
        // CASO DNI (DniResponse)
        else if ('nombreCompleto' in data) {
            const dniData = data as DniResponse;
            setFormData(prev => ({
                ...prev,
                descripcion: dniData.nombreCompleto,
                direccion: dniData.direccion || '' // DNI a veces no trae dirección
            }));
        }
    };

    // 4. Guardar
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (transportistaToEdit?.transportistaId) {
                await transportistaService.update(transportistaToEdit.transportistaId, formData);
                toast.success("Transportista actualizado correctamente");
            } else {
                await transportistaService.create(formData);
                toast.success("Transportista registrado correctamente");
            }
            onSuccess();
            onClose();
        } catch (error) {
            toast.error("Error al procesar la solicitud");
        } finally {
            setLoading(false);
        }
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
                        options={catalogs?.documento_identidad} 
                        value={formData.docidentId || ''} 
                        onChange={handleChange} 
                        disabled={isReadOnly}
                    />

                    {/* INPUT INTELIGENTE DE BÚSQUEDA */}
                    <ExternalSearchInput
                        label="Número Documento"
                        name="numero_doc"
                        value={formData.numero_doc || ''}
                        onChange={handleChange}
                        onSuccess={handleDataFound}
                        empresaId={EMPRESA_ID}
                        
                        // Usamos las keys exactas de tu JSON: "DNI", "CEX", "RUC"
                        type={
                            (formData.docidentId === 'DNI') ? 'DNI' : 
                            (formData.docidentId === 'CEX') ? 'CARNET' : 
                            'RUC' // Por defecto para "RUC" u otros
                        }

                        disabled={isReadOnly}
                        required
                        className="font-mono" 
                    />

                    {/* RAZÓN SOCIAL (Se llena solo) */}
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
                    
                    {/* DIRECCIÓN (Se llena solo con RUC) */}
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
                        <button type="submit" disabled={loading} className="bg-blue-600 text-white px-8 py-2 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50">
                            {loading ? <IconLoader className="animate-spin" size={20}/> : <IconDeviceFloppy size={20}/>}
                            {transportistaToEdit ? 'Guardar Cambios' : 'Registrar'}
                        </button>
                    </div>
                )}
            </form>
        </Modal>
    );
}
