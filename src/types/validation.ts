export type ValidationRule<T = any> = (value: T) => string | null;
export type ValidationRules<T> = { [K in keyof T]?: ValidationRule<T[K]>[]; };
export interface ValidationResult { valid: boolean; errors: Record<string, string>; }

export interface FieldValidation { required?: boolean | string; min?: number | { value: number; message: string }; max?: number | { value: number; message: string }; pattern?: RegExp | { value: RegExp; message: string }; custom?: ValidationRule; }

export const createRule = (test: (value: any) => boolean, message: string): ValidationRule => (value) => test(value) ? null : message;

export const rules = {
  required: (msg = 'Campo obrigatório') => createRule(v => v !== '' && v !== null && v !== undefined, msg),
  email: (msg = 'Email inválido') => createRule(v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), msg),
  minLength: (min: number, msg?: string) => createRule(v => String(v).length >= min, msg || \`Mínimo \${min} caracteres\`),
  maxLength: (max: number, msg?: string) => createRule(v => String(v).length <= max, msg || \`Máximo \${max} caracteres\`),
  min: (min: number, msg?: string) => createRule(v => Number(v) >= min, msg || \`Valor mínimo: \${min}\`),
  max: (max: number, msg?: string) => createRule(v => Number(v) <= max, msg || \`Valor máximo: \${max}\`),
};
