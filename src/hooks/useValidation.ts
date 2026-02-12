// src/hooks/useValidation.ts
import { useState, useCallback } from 'react';

export function useValidation() {
    const [errors, setErrors] = useState<Set<string>>(new Set());

    // Agregar un error manualmente
    const addError = useCallback((field: string) => {
        setErrors(prev => new Set(prev).add(field));
    }, []);

    // Limpiar un error específico (cuando el usuario escribe)
    const clearError = useCallback((field: string) => {
        setErrors(prev => {
            const next = new Set(prev);
            if (next.delete(field)) return next;
            return prev;
        });
    }, []);

    // Verificar si un campo tiene error
    const hasError = useCallback((field: string) => errors.has(field), [errors]);

    // Validar un conjunto de reglas
    // rules = { "campo": valor, "campo2": valor }
    const validate = useCallback((rules: Record<string, any>) => {
        const newErrors = new Set<string>();
        let isValid = true;

        Object.entries(rules).forEach(([field, value]) => {
            // Regla simple: Si es falsy (null, undefined, "", 0), es error.
            // Puedes hacer lógica más compleja aquí si quieres.
            if (!value || (typeof value === 'string' && value.trim() === '') || (typeof value === 'number' && value <= 0)) {
                newErrors.add(field);
                isValid = false;
            }
        });

        setErrors(newErrors);
        return isValid;
    }, []);

    const resetErrors = useCallback(() => setErrors(new Set()), []);

    return { errors, addError, clearError, hasError, validate, resetErrors };
}