export type ProveedorWhatsApp = 'meta_whatsapp' | 'twilio_whatsapp' | 'twilio_sms';
export type EstadoSenderWhatsApp = 'pendiente' | 'verificado' | 'activo' | 'suspendido';

export interface SenderWhatsApp {
    senderWhatsappId: string;
    clienteWhatsappId: string;
    proveedor: ProveedorWhatsApp;
    numero_telefono: string;
    waba_id?: string | null;
    phone_number_id?: string | null;
    twilio_account_sid?: string | null;
    estado: EstadoSenderWhatsApp;
    fecha_creacion?: string;
    fecha_actualizacion?: string | null;
}

export interface SenderWhatsAppCreatePayload {
    clienteWhatsappId: string;
    proveedor: ProveedorWhatsApp;
    numero_telefono: string;
    waba_id?: string;
    phone_number_id?: string;
    twilio_account_sid?: string;
    access_token_cifrado: string;
}

export interface SenderWhatsAppUpdatePayload {
    waba_id?: string;
    phone_number_id?: string;
    twilio_account_sid?: string;
    access_token_cifrado?: string;
}
