/**
 * Number Utilities
 */

export const isNumber = (value: unknown): value is number => 
  typeof value === 'number' && !isNaN(value);

export const isInteger = (value: unknown): value is number => 
  Number.isInteger(value);

export const isPositive = (value: number): boolean => value > 0;
export const isNegative = (value: number): boolean => value < 0;
export const isZero = (value: number): boolean => value === 0;
export const isEven = (value: number): boolean => value % 2 === 0;
export const isOdd = (value: number): boolean => value % 2 !== 0;

export const toNumber = (value: unknown, fallback = 0): number => {
  const num = Number(value);
  return isNaN(num) ? fallback : num;
};

export const parseNumber = (str: string): number | null => {
  const num = parseFloat(str.replace(/[^\d.-]/g, ''));
  return isNaN(num) ? null : num;
};

export const formatNumber = (value: number, locale = 'pt-BR'): string => 
  new Intl.NumberFormat(locale).format(value);

export const formatCompact = (value: number, locale = 'pt-BR'): string =>
  new Intl.NumberFormat(locale, { notation: 'compact' }).format(value);

export const formatOrdinal = (n: number, locale = 'pt-BR'): string => {
  if (locale === 'pt-BR') return `${n}º`;
  const rules = new Intl.PluralRules(locale, { type: 'ordinal' });
  const suffixes: Record<string, string> = { one: 'st', two: 'nd', few: 'rd', other: 'th' };
  return `${n}${suffixes[rules.select(n)] || 'th'}`;
};

export const padZero = (num: number, length: number): string => 
  String(num).padStart(length, '0');

export const randomInt = (min: number, max: number): number => 
  Math.floor(Math.random() * (max - min + 1)) + min;

export const randomFloat = (min: number, max: number): number => 
  Math.random() * (max - min) + min;

export const inRange = (value: number, min: number, max: number): boolean => 
  value >= min && value <= max;

export const toPercentage = (value: number, decimals = 0): string => 
  `${(value * 100).toFixed(decimals)}%`;

export const fromPercentage = (str: string): number => 
  parseFloat(str.replace('%', '')) / 100;

export const abbreviate = (num: number): string => {
  const units = ['', 'K', 'M', 'B', 'T'];
  let unitIndex = 0;
  while (Math.abs(num) >= 1000 && unitIndex < units.length - 1) {
    num /= 1000;
    unitIndex++;
  }
  return `${num.toFixed(1).replace(/\.0$/, '')}${units[unitIndex]}`;
};
