export const CLIENTE_WHATSAPP_ID = process.env.NEXT_PUBLIC_CLIENTE_WHATSAPP_ID || '1';

export const WHATSAPP_PAGE_SIZE = 20;

export const getApiErrorMessage = (error: unknown, fallback: string): string => {
    if (typeof error === 'object' && error !== null && 'response' in error) {
        const response = (error as { response?: { data?: { message?: string } } }).response;
        return response?.data?.message || fallback;
    }

    return error instanceof Error ? error.message : fallback;
};
