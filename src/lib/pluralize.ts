/**
 * Pluralize utility for Portuguese
 * @module lib/pluralize
 */

export function pluralize(count: number, singular: string, plural?: string): string {
  const p = plural || singular + 's';
  return count === 1 ? singular : p;
}

export function pluralizeWithCount(count: number, singular: string, plural?: string): string {
  return `${count} ${pluralize(count, singular, plural)}`;
}

// Common Portuguese pluralizations
export const pluralizeItem = (count: number) => pluralizeWithCount(count, 'item', 'itens');
export const pluralizeArquivo = (count: number) => pluralizeWithCount(count, 'arquivo');
export const pluralizeMensagem = (count: number) => pluralizeWithCount(count, 'mensagem', 'mensagens');
export const pluralizeUsuario = (count: number) => pluralizeWithCount(count, 'usuário');
export const pluralizeDia = (count: number) => pluralizeWithCount(count, 'dia');
export const pluralizeHora = (count: number) => pluralizeWithCount(count, 'hora');
export const pluralizeMinuto = (count: number) => pluralizeWithCount(count, 'minuto');

export default { pluralize, pluralizeWithCount };
