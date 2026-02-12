// src/app/dashboard/unidad-transporte/components/UnidadFormModal.tsx
"use client";
import { useState, useEffect } from 'react';
import { unidadTransporteService } from '@/services/unidadTransporteService';
import Modal from '@/components/ui/Modal';
import SearchableSelect from '@/components/forms/SearchableSelect';
import ExternalSearchInput from '@/components/forms/ExternalSearchInput'; // Importamos el componente buscador
import { IconDeviceFloppy, IconLoader } from '@tabler/icons-react';
import { toast } from 'sonner';
import { UnidadTransporte } from '@/types/unidadTransporte.types';
import { PlacaVehiculoResponse } from '@/types/apiExternal.types'; // Asegúrate de tener este tipo exportado

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    unitToEdit?: UnidadTransporte | null;
}

// --- COMPONENTE AUXILIAR ---
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
    
    const EMPRESA_ID = "005";

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
        empresaId: EMPRESA_ID,
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
            const filtrados = catalogs.modelo.filter(
                (m: any) => String(m.groupKey || m.marcaId) === String(selectedMarca)
            );
            setFilteredModelos(filtrados);
        } else {
            setFilteredModelos([]);
        }
    }, [selectedMarca, catalogs]);

    // --- MANEJO DE CAMBIOS ---

    const handleMarcaChange = (e: any) => {
        const newMarcaId = e.target.value;
        setSelectedMarca(newMarcaId);
        setFormData(prev => ({ ...prev, modeloId: '' })); 
    };

    const handleChange = (e: any) => {
        const { name, value } = e.target;
        
        // Transformación especial para placas (limpiar guiones si quieres guardar limpio, o dejarlos)
        // Aquí solo aseguramos Mayúsculas visualmente, el ExternalInput ya maneja lo suyo.
        let finalValue = value;
        if (name === 'nro_matricula_cabina') {
            finalValue = value.toUpperCase();
        }

        setFormData(prev => ({ ...prev, [name]: finalValue }));
    };

    // --- LÓGICA DE BÚSQUEDA DE PLACA (API EXTERNA) ---
    const handlePlacaFound = (data: PlacaVehiculoResponse) => {
        // data trae: { placa, marca, modelo, serie, color, motor, vin }
        
        // 1. Intentar encontrar el ID de la Marca (Texto API vs Texto Catálogo)
        let foundMarcaId = "";
        if (data.marca && catalogs?.marca) {
            const marcaText = data.marca.trim().toUpperCase();
            const marcaMatch = catalogs.marca.find((m: any) => m.value.trim().toUpperCase() === marcaText);
            if (marcaMatch) foundMarcaId = String(marcaMatch.key);
        }

        // 2. Intentar encontrar el ID del Modelo (Necesitamos la marca primero)
        let foundModeloId = "";
        if (foundMarcaId && data.modelo && catalogs?.modelo) {
            const modeloText = data.modelo.trim().toUpperCase();
            // Buscamos solo en los modelos que pertenecen a esa marca (groupKey)
            const modeloMatch = catalogs.modelo.find((m: any) => 
                String(m.groupKey) === foundMarcaId && 
                m.value.trim().toUpperCase() === modeloText
            );
            if (modeloMatch) foundModeloId = String(modeloMatch.key);
        }

        // 3. Construir descripción automática si está vacía
        const descAuto = `${data.marca || ''} ${data.modelo || ''} - ${data.placa || ''}`.trim();

        // 4. Actualizar Estado
        setSelectedMarca(foundMarcaId); // Esto disparará el useEffect que filtra los modelos
        
        setFormData(prev => ({
            ...prev,
            nro_matricula_cabina: data.placa || prev.nro_matricula_cabina,
            descripcion: prev.descripcion || descAuto, // Llena descripción si está vacía
            modeloId: foundModeloId, // Asigna el modelo si hubo match
            // Guardamos datos extra en observaciones ya que no hay campos específicos
            observaciones: `COLOR: ${data.color || '-'} | MOTOR: ${data.motor || '-'} | VIN: ${data.vin || '-'} | SERIE: ${data.serie || '-'}`
        }));

        // Feedback al usuario
        if (foundMarcaId && foundModeloId) {
            toast.success("Vehículo identificado y vinculado al catálogo.");
        } else if (foundMarcaId) {
            toast.warning("Marca vinculada, pero el modelo no existe en el catálogo.");
        } else {
            toast.warning("Datos obtenidos, pero la Marca/Modelo no existen en su catálogo.");
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (unitToEdit?.unidadtransporteId) {
                await unidadTransporteService.update(unitToEdit.unidadtransporteId, formData);
                toast.success("Vehículo actualizado correctamente");
            } else {
                await unidadTransporteService.create(formData);
                toast.success("Vehículo registrado correctamente");
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
            title={isReadOnly ? "Detalle Vehículo" : unitToEdit ? "Editar Vehículo" : "Nuevo Vehículo"} 
            size="xl"
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                    
                    {/* PLACA CON BÚSQUEDA INTEGRADA */}
                    <div className="md:col-span-1">
                         <ExternalSearchInput
                            label="Placa Cabina"
                            name="nro_matricula_cabina"
                            value={formData.nro_matricula_cabina || ''}
                            onChange={handleChange}
                            onSuccess={handlePlacaFound}
                            empresaId={EMPRESA_ID}
                            type="PLACA" // Usa el nuevo tipo agregado
                            disabled={isReadOnly}
                            required
                            placeholder="ABC-123"
                            className="font-mono font-bold"
                        />
                    </div>

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