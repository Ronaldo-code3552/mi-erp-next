// src/types/index.ts

export interface ApiResponse<T> {
    isSuccess: boolean;
    data: T;
    meta?: {
        totalRecords: number;
        totalPages: number;
        currentPage: number;
        pageSize?: number;
        totalStock?: number;
        TotalRecords?: number;
        TotalPages?: number;
        CurrentPage?: number;
        PageSize?: number;
        TotalStock?: number;
    };
    message?: string;
}
export * from './solicitudReposicion.types';