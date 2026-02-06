// src/app/dashboard/unidad-transporte/components/UnidadFormModal.tsx
"use client";
import { useState, useEffect } from 'react';
import { unidadTransporteService } from '@/services/unidadTransporteService';
import Modal from '@/components/ui/Modal';
import SearchableSelect from '@/components/forms/SearchableSelect';
import { IconDeviceFloppy, IconLoader } from '@tabler/icons-react';
import { toast } from 'sonner';
import { UnidadTransporte } from '@/types/unidadTransporte.types';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    unitToEdit?: UnidadTransporte | null;
}

// --- COMPONENTE AUXILIAR CORREGIDO ---
// Ahora acepta 'className' y lo combina con los estilos base
const FormInput = ({ label, className, ...props }: any) => (
    <div className="flex flex-col gap-1.5 text-left">
        <label className="text-xs font-bold text-slate-500 uppercase">{label}</label>
        <input 
            className={`w-full border border-slate-200 p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400 transition-all uppercase ${className || ''}`} 
            {...props} 
        />
    </div>
);

// --- COMPONENTE PRINCIPAL ---
export default function UnidadFormModal({ isOpen, onClose, onSuccess, unitToEdit }: Props) {
    const [loading, setLoading] = useState(false);
    const [catalogs, setCatalogs] = useState<any>(null);
    
    // Estados para lógica dependiente (Marca -> Modelo)
    const [selectedMarca, setSelectedMarca] = useState("");
    const [filteredModelos, setFilteredModelos] = useState<any[]>([]);

    const isReadOnly = !!(unitToEdit && unitToEdit.estado === "0");

    const initialState: Partial<UnidadTransporte> = {
        descripcion: '', 
        nro_matricula_cabina: '',
        modeloId: '', 
        peso_maximo: 0,
        certificado_inscripcion: '',
        nro_matricula_carrosa1: '',
        nro_matricula_carrosa2: '',
        observaciones: '',
        empresaId: '005',
        estado: '1'
    };

    const [formData, setFormData] = useState<Partial<UnidadTransporte>>(initialState);

    // 1. CARGA DE DATOS Y CATÁLOGOS
    useEffect(() => {
        if (isOpen) {
            unidadTransporteService.getFormDropdowns().then(res => {
                if (res.isSuccess) setCatalogs(res.data);
            });

            if (unitToEdit) {
                setFormData(unitToEdit);
                // Pre-seleccionar la marca basada en el modelo de la unidad
                if (unitToEdit.modelo?.marcaId) {
                    setSelectedMarca(String(unitToEdit.modelo.marcaId));
                }
            } else {
                setFormData(initialState);
                setSelectedMarca("");
            }
        }
    }, [isOpen, unitToEdit]);

    // 2. FILTRADO DE MODELOS (Cascading Dropdown)
    useEffect(() => {
        if (selectedMarca && catalogs?.modelo) {
            // Filtramos los modelos que pertenezcan a la marca seleccionada
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
        // Limpiamos el modelo al cambiar de marca para evitar inconsistencias
        setFormData(prev => ({ ...prev, modeloId: '' })); 
    };

    const handleChange = (e: any) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const payload = {
            ...formData,
            empresaId: '005'
        };

        try {
            if (unitToEdit?.unidadtransporteId) {
                await unidadTransporteService.update(unitToEdit.unidadtransporteId, payload);
                toast.success("Vehículo actualizado correctamente");
            } else {
                await unidadTransporteService.create(payload);
                toast.success("Vehículo registrado correctamente");
            }
            onSuccess();
            onClose();
        } catch (error) {
            console.error(error); 
            toast.error("Error al procesar la solicitud");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal 
            isOpen={isOpen} 
            onClose={onClose} 
            title={isReadOnly ? "Detalle Vehículo" : unitToEdit ? "Editar Vehículo" : "Nuevo Vehículo"} 
            size="xl"
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    
                    {/* SECCIÓN PRINCIPAL */}
                    <div className="md:col-span-2">
                        <FormInput 
                            label="Descripción / Nombre" 
                            name="descripcion" 
                            value={formData.descripcion || ''} 
                            onChange={handleChange} 
                            required 
                            disabled={isReadOnly}
                            placeholder="Ej: VOLVO FH 500 BLANCO" 
                        />
                    </div>
                    
                    {/* AHORA SÍ: Mantiene los estilos base y agrega font-mono */}
                    <FormInput 
                        label="Placa Cabina" 
                        name="nro_matricula_cabina" 
                        value={formData.nro_matricula_cabina || ''} 
                        onChange={handleChange} 
                        required 
                        disabled={isReadOnly}
                        className="font-mono font-bold" 
                        placeholder="ABC-123" 
                    />

                    {/* LÓGICA DE MARCA Y MODELO */}
                    <SearchableSelect 
                        label="Marca" 
                        name="marca" 
                        options={catalogs?.marca} 
                        value={selectedMarca} 
                        onChange={handleMarcaChange} 
                        disabled={isReadOnly}
                    />

                    <SearchableSelect 
                        label="Modelo" 
                        name="modeloId"
                        options={filteredModelos} 
                        value={formData.modeloId || ''} 
                        onChange={handleChange}
                        disabled={!selectedMarca || filteredModelos.length === 0 || isReadOnly}
                        placeholder={!selectedMarca ? "Seleccione marca primero" : "Seleccione modelo"}
                    />

                    <FormInput label="Peso Máximo (KG)" name="peso_maximo" type="number" value={formData.peso_maximo || 0} onChange={handleChange} disabled={isReadOnly} />

                    {/* DOCUMENTACIÓN Y CARRETAS */}
                    <FormInput label="Cert. Inscripción" name="certificado_inscripcion" value={formData.certificado_inscripcion || ''} onChange={handleChange} disabled={isReadOnly} />
                    <FormInput label="Placa Carreta 1" name="nro_matricula_carrosa1" value={formData.nro_matricula_carrosa1 || ''} onChange={handleChange} disabled={isReadOnly} />
                    <FormInput label="Placa Carreta 2" name="nro_matricula_carrosa2" value={formData.nro_matricula_carrosa2 || ''} onChange={handleChange} disabled={isReadOnly} />

                    {/* OBSERVACIONES */}
                    <div className="md:col-span-3">
                         <FormInput label="Observaciones" name="observaciones" value={formData.observaciones || ''} onChange={handleChange} disabled={isReadOnly} />
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
    );
}