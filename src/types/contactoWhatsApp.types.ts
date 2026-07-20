export interface ContactoWhatsApp {
    contactoWhatsappId: string;
    clienteWhatsappId: string;
    numero_telefono: string;
    nombre?: string | null;
    opt_in: boolean;
    fecha_creacion?: string;
    fecha_actualizacion?: string | null;
    ultima_actividad?: string | null;
}

export interface ContactoWhatsAppCreatePayload {
    clienteWhatsappId: string;
    numero_telefono: string;
    nombre?: string;
    opt_in?: boolean;
}

export interface ContactoWhatsAppUpdatePayload {
    nombre?: string;
}
