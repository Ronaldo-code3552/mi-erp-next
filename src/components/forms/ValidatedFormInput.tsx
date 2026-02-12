// src/components/forms/ValidatedFormInput.tsx
import { IconAlertCircle } from '@tabler/icons-react';
import { getInputClasses, FORM_STYLES } from '@/utils/formStyles';

interface Props extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: boolean; // ¿Tiene error?
    errorText?: string; // Mensaje opcional
}

export default function ValidatedFormInput({ label, error = false, errorText, className, disabled, ...props }: Props) {
    return (
        <div className="w-full text-left">
            {label && (
                <label className={`${FORM_STYLES.label} ${error ? FORM_STYLES.labelError : ''}`}>
                    {label} {error && '*'}
                </label>
            )}
            
            <div className="relative">
                <input 
                    className={getInputClasses(error, disabled, className)} 
                    disabled={disabled}
                    {...props} 
                />
                
                {/* Icono de alerta dentro del input si hay error */}
                {error && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500 pointer-events-none">
                        <IconAlertCircle size={16} />
                    </div>
                )}
            </div>

            {/* Mensaje de error opcional */}
            {error && errorText && (
                <span className={FORM_STYLES.errorMessage}>
                    {errorText}
                </span>
            )}
        </div>
    );
}