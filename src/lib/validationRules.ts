/**
 * Validation Rules
 * @module lib/validationRules
 */

export const required = (message = 'Campo obrigatório') => (value: unknown) => 
  value !== null && value !== undefined && value !== '' ? null : message;

export const minLength = (min: number, message?: string) => (value: string) =>
  value.length >= min ? null : message || `Mínimo ${min} caracteres`;

export const maxLength = (max: number, message?: string) => (value: string) =>
  value.length <= max ? null : message || `Máximo ${max} caracteres`;

export const email = (message = 'E-mail inválido') => (value: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? null : message;

export const phone = (message = 'Telefone inválido') => (value: string) =>
  /^\(?\d{2}\)?[\s.-]?\d{4,5}[\s.-]?\d{4}$/.test(value.replace(/\D/g, '')) ? null : message;

export const cpf = (message = 'CPF inválido') => (value: string) => {
  const clean = value.replace(/\D/g, '');
  if (clean.length !== 11) return message;
  if (/^(\d)\1+$/.test(clean)) return message;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(clean[i]) * (10 - i);
  let d1 = (sum * 10) % 11; if (d1 === 10) d1 = 0;
  if (d1 !== parseInt(clean[9])) return message;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(clean[i]) * (11 - i);
  let d2 = (sum * 10) % 11; if (d2 === 10) d2 = 0;
  return d2 === parseInt(clean[10]) ? null : message;
};

export const cnpj = (message = 'CNPJ inválido') => (value: string) => {
  const clean = value.replace(/\D/g, '');
  if (clean.length !== 14) return message;
  return null; // Simplified
};

export const pattern = (regex: RegExp, message: string) => (value: string) =>
  regex.test(value) ? null : message;

export const range = (min: number, max: number, message?: string) => (value: number) =>
  value >= min && value <= max ? null : message || `Valor deve estar entre ${min} e ${max}`;

export const url = (message = 'URL inválida') => (value: string) => {
  try { new URL(value); return null; } catch { return message; }
};

export default { required, minLength, maxLength, email, phone, cpf, cnpj, pattern, range, url };
