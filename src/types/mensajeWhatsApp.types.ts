import { PlantillaWhatsApp } from './plantillaWhatsApp.types';

export type DireccionMensajeWhatsApp = 'saliente' | 'entrante';
export type TipoMensajeWhatsApp = 'plantilla' | 'texto_libre' | 'media';
export type EstadoMensajeWhatsApp = 'encolado' | 'enviado' | 'entregado' | 'leido' | 'fallido' | 'recibido';

export interface MensajeWhatsApp {
    mensajeWhatsappId: string;
    conversacionWhatsappId?: string | null;
    senderWhatsappId: string;
    contactoWhatsappId?: string | null;
    plantillaWhatsappId?: string | null;
    numero_receptor?: string | null;
    direccion: DireccionMensajeWhatsApp;
    tipo: TipoMensajeWhatsApp;
    estado: EstadoMensajeWhatsApp;
    mensaje?: string | null;
    contenido?: string | null;
    proveedor_mensaje_id?: string | null;
    error_detalle?: string | null;
    fecha_creacion?: string;
    fecha_envio?: string | null;
    fecha_entrega?: string | null;
    fecha_lectura?: string | null;
    plantilla?: PlantillaWhatsApp | null;
}

export interface EnviarMensajeWhatsAppPayload {
    senderWhatsappId: string;
    numeroReceptor: string;
    plantillaWhatsappId?: string;
    mensaje?: string;
}

export interface EnviarMensajeWhatsAppResponse {
    mensajeWhatsappId: string;
}

export interface EventoEstadoMensajeWhatsApp {
    eventoEstadoMensajeWhatsappId?: string;
    mensajeWhatsappId: string;
    estado: EstadoMensajeWhatsApp;
    detalle?: string | null;
    fecha_evento?: string;
    fecha_creacion?: string;
}

export interface MensajeWhatsAppLogFilters {
    senderWhatsappId?: string;
    estado?: EstadoMensajeWhatsApp;
    direccion?: DireccionMensajeWhatsApp;
    fechaDesde?: string;
    fechaHasta?: string;
}
