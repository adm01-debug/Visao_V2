/**
 * Input Mask Utilities
 * @module lib/mask
 */

export function maskCPF(value: string): string {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .slice(0, 14);
}

export function maskCNPJ(value: string): string {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})/, '$1-$2')
    .slice(0, 18);
}

export function maskPhone(value: string): string {
  const cleaned = value.replace(/\D/g, '');
  if (cleaned.length <= 10) {
    return cleaned.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3');
  }
  return cleaned.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').slice(0, 15);
}

export function maskCEP(value: string): string {
  return value.replace(/\D/g, '').replace(/(\d{5})(\d{0,3})/, '$1-$2').slice(0, 9);
}

export function maskCurrency(value: string): string {
  const num = value.replace(/\D/g, '');
  const formatted = (parseInt(num || '0') / 100).toLocaleString('pt-BR', {
    style: 'currency', currency: 'BRL'
  });
  return formatted;
}

export function maskDate(value: string): string {
  return value.replace(/\D/g, '').replace(/(\d{2})(\d)/, '$1/$2').replace(/(\d{2})(\d)/, '$1/$2').slice(0, 10);
}

export function maskCreditCard(value: string): string {
  return value.replace(/\D/g, '').replace(/(\d{4})/g, '$1 ').trim().slice(0, 19);
}

export default { maskCPF, maskCNPJ, maskPhone, maskCEP, maskCurrency, maskDate, maskCreditCard };
