export const capitalize = (str: string): string => str.charAt(0).toUpperCase() + str.slice(1);
export const slugify = (str: string): string => str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
export const truncate = (str: string, len: number): string => str.length <= len ? str : str.slice(0, len) + '...';
export const removeAccents = (str: string): string => str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
export const maskEmail = (email: string): string => {
  const [name, domain] = email.split('@');
  return name.slice(0, 2) + '***@' + domain;
};
export const maskPhone = (phone: string): string => phone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) *****-$3');
