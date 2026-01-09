// Validation Service - Projeto VISÃO
// Serviço de validação com tipagem forte usando Zod patterns

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: ValidationError[];
}

export type ValidatorFn<T> = (value: T) => string | null;

export interface FieldValidators<T> {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  email?: boolean;
  url?: boolean;
  custom?: ValidatorFn<T>;
}

export type Schema<T> = {
  [K in keyof T]?: FieldValidators<T[K]>;
};

const validators = {
  required: <T>(value: T): string | null =>
    value === undefined || value === null || value === '' ? 'Campo obrigatório' : null,
  
  minLength: (min: number) => (value: string): string | null =>
    value.length < min ? `Mínimo ${min} caracteres` : null,
  
  maxLength: (max: number) => (value: string): string | null =>
    value.length > max ? `Máximo ${max} caracteres` : null,
  
  min: (min: number) => (value: number): string | null =>
    value < min ? `Valor mínimo: ${min}` : null,
  
  max: (max: number) => (value: number): string | null =>
    value > max ? `Valor máximo: ${max}` : null,
  
  email: (value: string): string | null =>
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? 'Email inválido' : null,
  
  url: (value: string): string | null => {
    try { new URL(value); return null; }
    catch { return 'URL inválida'; }
  },
  
  pattern: (regex: RegExp, message = 'Formato inválido') => (value: string): string | null =>
    !regex.test(value) ? message : null,
};

export const validate = <T extends Record<string, unknown>>(
  data: T,
  schema: Schema<T>
): ValidationResult<T> => {
  const errors: ValidationError[] = [];

  for (const [field, rules] of Object.entries(schema)) {
    if (!rules) continue;
    const value = data[field as keyof T];
    const fieldRules = rules as FieldValidators<typeof value>;

    if (fieldRules.required) {
      const error = validators.required(value);
      if (error) errors.push({ field, message: error, code: 'required' });
    }

    if (typeof value === 'string') {
      if (fieldRules.minLength) {
        const error = validators.minLength(fieldRules.minLength)(value);
        if (error) errors.push({ field, message: error, code: 'minLength' });
      }
      if (fieldRules.maxLength) {
        const error = validators.maxLength(fieldRules.maxLength)(value);
        if (error) errors.push({ field, message: error, code: 'maxLength' });
      }
      if (fieldRules.email) {
        const error = validators.email(value);
        if (error) errors.push({ field, message: error, code: 'email' });
      }
      if (fieldRules.url) {
        const error = validators.url(value);
        if (error) errors.push({ field, message: error, code: 'url' });
      }
      if (fieldRules.pattern) {
        const error = validators.pattern(fieldRules.pattern)(value);
        if (error) errors.push({ field, message: error, code: 'pattern' });
      }
    }

    if (typeof value === 'number') {
      if (fieldRules.min !== undefined) {
        const error = validators.min(fieldRules.min)(value);
        if (error) errors.push({ field, message: error, code: 'min' });
      }
      if (fieldRules.max !== undefined) {
        const error = validators.max(fieldRules.max)(value);
        if (error) errors.push({ field, message: error, code: 'max' });
      }
    }

    if (fieldRules.custom) {
      const error = fieldRules.custom(value);
      if (error) errors.push({ field, message: error, code: 'custom' });
    }
  }

  return errors.length > 0 ? { success: false, errors } : { success: true, data };
};

export default { validate, validators };
