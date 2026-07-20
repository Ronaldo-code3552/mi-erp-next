export type CategoriaPlantillaWhatsApp = 'order_notification' | 'appointment_reminder' | 'verification_code' | 'custom';
export type EstadoAprobacionPlantilla = 'borrador' | 'en_revision' | 'aprobado' | 'rechazado';

export interface PlantillaWhatsApp {
    plantillaWhatsappId: string;
    clienteWhatsappId?: string | null;
    categoria: CategoriaPlantillaWhatsApp;
    nombre_interno: string;
    idioma: string;
    cuerpo_texto: string;
    es_default: boolean;
    estado_aprobacion: EstadoAprobacionPlantilla;
    nombre_proveedor?: string | null;
    fecha_creacion?: string;
    fecha_actualizacion?: string | null;
}

export interface PlantillaWhatsAppCreatePayload {
    clienteWhatsappId?: string | null;
    categoria: CategoriaPlantillaWhatsApp;
    nombre_interno: string;
    idioma?: string;
    cuerpo_texto: string;
    es_default?: boolean;
}

export interface PlantillaWhatsAppUpdatePayload {
    nombre_interno?: string;
    cuerpo_texto?: string;
}
