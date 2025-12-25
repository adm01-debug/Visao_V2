type ValidationRule = (value: any) => string | null;

interface ValidationResult { valid: boolean; errors: Record<string, string>; }

class ValidationService {
  required(message = 'Campo obrigatório'): ValidationRule {
    return (value) => (value === undefined || value === null || value === '') ? message : null;
  }

  email(message = 'Email inválido'): ValidationRule {
    return (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? null : message;
  }

  minLength(min: number, message?: string): ValidationRule {
    return (value) => String(value).length >= min ? null : message || `Mínimo ${min} caracteres`;
  }

  maxLength(max: number, message?: string): ValidationRule {
    return (value) => String(value).length <= max ? null : message || `Máximo ${max} caracteres`;
  }

  min(min: number, message?: string): ValidationRule {
    return (value) => Number(value) >= min ? null : message || `Valor mínimo: ${min}`;
  }

  max(max: number, message?: string): ValidationRule {
    return (value) => Number(value) <= max ? null : message || `Valor máximo: ${max}`;
  }

  pattern(regex: RegExp, message = 'Formato inválido'): ValidationRule {
    return (value) => regex.test(value) ? null : message;
  }

  cpf(message = 'CPF inválido'): ValidationRule {
    return (value) => {
      const cpf = String(value).replace(/\D/g, '');
      if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return message;
      // Simplified validation
      return null;
    };
  }

  phone(message = 'Telefone inválido'): ValidationRule {
    return (value) => /^\d{10,11}$/.test(String(value).replace(/\D/g, '')) ? null : message;
  }

  validate(value: any, rules: ValidationRule[]): string | null {
    for (const rule of rules) {
      const error = rule(value);
      if (error) return error;
    }
    return null;
  }

  validateForm(data: Record<string, any>, schema: Record<string, ValidationRule[]>): ValidationResult {
    const errors: Record<string, string> = {};
    
    for (const [field, rules] of Object.entries(schema)) {
      const error = this.validate(data[field], rules);
      if (error) errors[field] = error;
    }

    return { valid: Object.keys(errors).length === 0, errors };
  }
}

export const validationService = new ValidationService();
export default validationService;
