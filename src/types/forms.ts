// Form Types - Projeto VISÃO
// Tipagem forte para formulários

export interface FormState<T> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isSubmitting: boolean;
  isValid: boolean;
  isDirty: boolean;
}

export interface FormActions<T> {
  setValue: <K extends keyof T>(field: K, value: T[K]) => void;
  setError: (field: keyof T, error: string) => void;
  setTouched: (field: keyof T, touched: boolean) => void;
  reset: () => void;
  submit: () => Promise<void>;
  validate: () => boolean;
}

export type FormValidator<T> = (values: T) => Partial<Record<keyof T, string>>;

export interface FormConfig<T> {
  initialValues: T;
  validate?: FormValidator<T>;
  onSubmit: (values: T) => Promise<void>;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
}

export interface FormFieldProps<T, K extends keyof T> {
  name: K;
  value: T[K];
  error?: string;
  touched?: boolean;
  onChange: (value: T[K]) => void;
  onBlur: () => void;
}

export type FormSubmitHandler<T> = (values: T) => Promise<void> | void;

export interface FormArrayActions<T> {
  push: (item: T) => void;
  remove: (index: number) => void;
  move: (from: number, to: number) => void;
  insert: (index: number, item: T) => void;
  update: (index: number, item: T) => void;
}
