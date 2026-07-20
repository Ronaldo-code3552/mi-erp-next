import { ContactoWhatsApp } from './contactoWhatsApp.types';
import { SenderWhatsApp } from './senderWhatsApp.types';

export type EstadoConversacionWhatsApp = 'abierta' | 'cerrada';
export type IniciadaPorWhatsApp = 'negocio' | 'usuario';

export interface ConversacionWhatsApp {
    conversacionWhatsappId: string;
    senderWhatsappId: string;
    contactoWhatsappId: string;
    estado: EstadoConversacionWhatsApp;
    iniciada_por: IniciadaPorWhatsApp;
    ventana_abierta_en?: string | null;
    ventana_expira_en?: string | null;
    ultima_actividad?: string | null;
    fecha_creacion?: string;
    fecha_cierre?: string | null;
    numero_telefono?: string;
    nombre_contacto?: string | null;
    contacto?: ContactoWhatsApp;
    sender?: SenderWhatsApp;
}
