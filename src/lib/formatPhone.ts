/**
 * Phone Formatting Utilities
 * @module lib/formatPhone
 */

export function formatPhoneBR(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length === 11) {
    return cleaned.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  }
  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  return phone;
}

export function formatPhoneUS(phone: string): string {
  const cleaned = phone.replace(/\D/g, '');
  
  if (cleaned.length === 10) {
    return cleaned.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
  }
  return phone;
}

export function cleanPhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

export function isValidPhoneBR(phone: string): boolean {
  const cleaned = cleanPhone(phone);
  return cleaned.length === 10 || cleaned.length === 11;
}

export default { formatPhoneBR, formatPhoneUS, cleanPhone, isValidPhoneBR };
