/**
 * Password Policy & Validation
 */

export interface PasswordPolicy {
  minLength: number;
  maxLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  specialChars: string;
  preventCommonPasswords: boolean;
  preventUserInfo: boolean;
}

export interface PasswordValidation {
  valid: boolean;
  score: number;
  errors: string[];
  suggestions: string[];
}

const DEFAULT_POLICY: PasswordPolicy = {
  minLength: 8,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  specialChars: '!@#$%^&*()_+-=[]{}|;:,.<>?',
  preventCommonPasswords: true,
  preventUserInfo: true,
};

const COMMON_PASSWORDS = new Set([
  'password', '123456', '12345678', 'qwerty', 'abc123',
  'password1', 'admin', 'letmein', 'welcome', 'monkey',
]);

export function validatePassword(
  password: string,
  policy: Partial<PasswordPolicy> = {},
  userInfo: string[] = []
): PasswordValidation {
  const p = { ...DEFAULT_POLICY, ...policy };
  const errors: string[] = [];
  const suggestions: string[] = [];
  let score = 0;

  // Length checks
  if (password.length < p.minLength) {
    errors.push(`Mínimo ${p.minLength} caracteres`);
  } else {
    score += Math.min(25, password.length * 2);
  }

  if (password.length > p.maxLength) {
    errors.push(`Máximo ${p.maxLength} caracteres`);
  }

  // Character type checks
  if (p.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push('Inclua letra maiúscula');
  } else if (/[A-Z]/.test(password)) {
    score += 15;
  }

  if (p.requireLowercase && !/[a-z]/.test(password)) {
    errors.push('Inclua letra minúscula');
  } else if (/[a-z]/.test(password)) {
    score += 15;
  }

  if (p.requireNumbers && !/\d/.test(password)) {
    errors.push('Inclua número');
  } else if (/\d/.test(password)) {
    score += 15;
  }

  if (p.requireSpecialChars) {
    const hasSpecial = [...password].some(c => p.specialChars.includes(c));
    if (!hasSpecial) {
      errors.push('Inclua caractere especial');
    } else {
      score += 20;
    }
  }

  // Common password check
  if (p.preventCommonPasswords && COMMON_PASSWORDS.has(password.toLowerCase())) {
    errors.push('Senha muito comum');
    score = Math.min(score, 20);
  }

  // User info check
  if (p.preventUserInfo) {
    const lower = password.toLowerCase();
    for (const info of userInfo) {
      if (info && lower.includes(info.toLowerCase())) {
        errors.push('Não use informações pessoais');
        score = Math.min(score, 30);
        break;
      }
    }
  }

  // Variety bonus
  const uniqueChars = new Set(password).size;
  score += Math.min(10, uniqueChars);

  // Suggestions
  if (score < 50) suggestions.push('Use uma frase longa com palavras aleatórias');
  if (!/[!@#$%]/.test(password)) suggestions.push('Adicione símbolos especiais');
  if (password.length < 12) suggestions.push('Senhas mais longas são mais seguras');

  return {
    valid: errors.length === 0,
    score: Math.min(100, Math.max(0, score)),
    errors,
    suggestions,
  };
}

export function getPasswordStrength(score: number): { label: string; color: string } {
  if (score < 30) return { label: 'Fraca', color: 'red' };
  if (score < 50) return { label: 'Razoável', color: 'orange' };
  if (score < 70) return { label: 'Boa', color: 'yellow' };
  if (score < 90) return { label: 'Forte', color: 'lime' };
  return { label: 'Excelente', color: 'green' };
}

export function generateSecurePassword(length = 16): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array).map(b => chars[b % chars.length]).join('');
}
