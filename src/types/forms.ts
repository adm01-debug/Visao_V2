export interface FieldConfig { name: string; label: string; type: 'text' | 'email' | 'password' | 'number' | 'select' | 'checkbox' | 'textarea' | 'date'; placeholder?: string; required?: boolean; options?: { label: string; value: string }[]; validation?: Record<string, any>; }
export interface FormConfig { fields: FieldConfig[]; submitLabel?: string; cancelLabel?: string; }

export interface FormState<T> { values: T; errors: Partial<Record<keyof T, string>>; touched: Partial<Record<keyof T, boolean>>; isSubmitting: boolean; isValid: boolean; }
export interface FormActions<T> { setValue: (field: keyof T, value: any) => void; setError: (field: keyof T, error: string) => void; setTouched: (field: keyof T) => void; reset: () => void; submit: () => Promise<void>; }

export type FormSubmitHandler<T> = (values: T) => Promise<void> | void;
export type FormValidateHandler<T> = (values: T) => Partial<Record<keyof T, string>>;
