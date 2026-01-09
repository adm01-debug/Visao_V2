// Validation Types - Projeto VISÃO
// Tipagem forte para validação de dados

export type ValidationRule<T = unknown> = (value: T) => string | null;

export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string>;
}

export interface FieldValidation<T> {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: RegExp;
  custom?: ValidationRule<T>;
  message?: string;
}

export type ValidationSchema<T> = {
  [K in keyof T]?: FieldValidation<T[K]>;
};

export interface Validator<T> {
  validate: (data: T) => ValidationResult;
  validateField: <K extends keyof T>(field: K, value: T[K]) => string | null;
  isValid: (data: T) => boolean;
}

export type AsyncValidationRule<T = unknown> = (value: T) => Promise<string | null>;

export interface AsyncValidator<T> {
  validate: (data: T) => Promise<ValidationResult>;
  validateField: <K extends keyof T>(field: K, value: T[K]) => Promise<string | null>;
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export type ValidationErrors = ValidationError[];

export interface ValidatedData<T> {
  success: true;
  data: T;
}

export interface InvalidData {
  success: false;
  errors: ValidationErrors;
}

export type ValidationResponse<T> = ValidatedData<T> | InvalidData;
