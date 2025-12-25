/**
 * String Utilities
 */

export const capitalize = (str: string): string =>
  str.charAt(0).toUpperCase() + str.slice(1);

export const capitalizeWords = (str: string): string =>
  str.replace(/\b\w/g, char => char.toUpperCase());

export const camelCase = (str: string): string =>
  str.replace(/[-_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : '').replace(/^./, c => c.toLowerCase());

export const pascalCase = (str: string): string =>
  capitalize(camelCase(str));

export const kebabCase = (str: string): string =>
  str.replace(/([a-z])([A-Z])/g, '$1-$2').replace(/[\s_]+/g, '-').toLowerCase();

export const snakeCase = (str: string): string =>
  str.replace(/([a-z])([A-Z])/g, '$1_$2').replace(/[\s-]+/g, '_').toLowerCase();

export const truncate = (str: string, length: number, suffix = '...'): string =>
  str.length > length ? str.slice(0, length - suffix.length) + suffix : str;

export const truncateWords = (str: string, count: number, suffix = '...'): string => {
  const words = str.split(' ');
  return words.length > count ? words.slice(0, count).join(' ') + suffix : str;
};

export const slugify = (str: string): string =>
  str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s-]/g, '').replace(/[\s_-]+/g, '-').replace(/^-+|-+$/g, '');

export const stripHtml = (str: string): string =>
  str.replace(/<[^>]*>/g, '');

export const escapeHtml = (str: string): string =>
  str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');

export const unescapeHtml = (str: string): string =>
  str.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#039;/g, "'");

export const reverse = (str: string): string =>
  [...str].reverse().join('');

export const isPalindrome = (str: string): boolean => {
  const clean = str.toLowerCase().replace(/[^a-z0-9]/g, '');
  return clean === reverse(clean);
};

export const countWords = (str: string): number =>
  str.trim().split(/\s+/).filter(Boolean).length;

export const countChars = (str: string, char: string): number =>
  str.split(char).length - 1;

export const padStart = (str: string, length: number, char = ' '): string =>
  str.padStart(length, char);

export const padEnd = (str: string, length: number, char = ' '): string =>
  str.padEnd(length, char);

export const padCenter = (str: string, length: number, char = ' '): string => {
  const padding = length - str.length;
  const left = Math.floor(padding / 2);
  return char.repeat(left) + str + char.repeat(padding - left);
};

export const removeAccents = (str: string): string =>
  str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

export const mask = (str: string, maskChar = '*', visibleStart = 0, visibleEnd = 0): string => {
  if (str.length <= visibleStart + visibleEnd) return str;
  const start = str.slice(0, visibleStart);
  const end = str.slice(-visibleEnd || undefined);
  const middle = maskChar.repeat(str.length - visibleStart - visibleEnd);
  return start + middle + (visibleEnd ? end : '');
};

export const isBlank = (str: string | null | undefined): boolean =>
  !str || str.trim().length === 0;

export const isEmpty = (str: string | null | undefined): boolean =>
  str === null || str === undefined || str.length === 0;

export const wordWrap = (str: string, width: number): string =>
  str.replace(new RegExp(`(?![^\\n]{1,${width}}$)([^\\n]{1,${width}})\\s`, 'g'), '$1\n');
