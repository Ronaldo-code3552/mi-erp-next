"use client";
import { useState, useEffect } from 'react';
import Modal from '@/components/ui/Modal'; // Tu modal base
import ValidatedFormInput from '@/components/forms/ValidatedFormInput';
import { useValidation } from '@/hooks/useValidation';
import { toast } from 'sonner';
import { IconDeviceFloppy, IconLoader } from '@tabler/icons-react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (newItem: any) => void;
    title: string;
    initialData?: { id?: number, descripcion: string } | null;
    service: any; // El servicio (marcaService o modeloService)
    extraData?: any; // Ej: { marcaId: 5 } para modelo
}

export default function SimpleCrudModal({ isOpen, onClose, onSuccess, title, initialData, service, extraData }: Props) {
    const [desc, setDesc] = useState("");
    const [loading, setLoading] = useState(false);
    const { hasError, validate } = useValidation();

    useEffect(() => {
        if (isOpen) {
            setDesc(initialData?.descripcion || "");
        }
    }, [isOpen, initialData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate({ desc })) return;

        setLoading(true);
        try {
            const payload = { 
                descripcion: desc.toUpperCase(), 
                estado: true,
                ...extraData 
            };

            let res;
            if (initialData?.id) {
                res = await service.update(initialData.id, payload);
            } else {
                res = await service.create(payload);
            }

            if (res.isSuccess) {
                toast.success("Guardado correctamente");
                // Devolvemos un objeto simulado para actualizar el select sin recargar todo
                onSuccess({ 
                    key: initialData?.id || res.data?.marcaId || res.data?.modeloId, // Ajustar según respuesta de tu API
                    value: desc.toUpperCase(),
                    ...extraData
                }); 
                onClose();
            } else {
                toast.error(res.message);
            }
        } catch (error) {
            toast.error("Error al guardar");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={title} size="sm">
            <form onSubmit={handleSubmit} className="space-y-4">
                <ValidatedFormInput 
                    label="Descripción" 
                    value={desc} 
                    onChange={(e) => setDesc(e.target.value)}
                    error={hasError('desc')}
                    autoFocus
                />
                <div className="flex justify-end pt-2">
                    <button type="submit" disabled={loading} className="bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-bold flex gap-2">
                        {loading ? <IconLoader className="animate-spin" size={16}/> : <IconDeviceFloppy size={16}/>}
                        Guardar
                    </button>
                </div>
            </form>
        </Modal>
    );
}