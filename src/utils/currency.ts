const DEFAULT_LOCALE = 'pt-BR';
const DEFAULT_CURRENCY = 'BRL';

export const formatCurrency = (value: number, currency = DEFAULT_CURRENCY, locale = DEFAULT_LOCALE): string => new Intl.NumberFormat(locale, { style: 'currency', currency }).format(value);
export const parseCurrency = (value: string): number => parseFloat(value.replace(/[^\d,-]/g, '').replace(',', '.'));
export const centsToCurrency = (cents: number): number => cents / 100;
export const currencyToCents = (value: number): number => Math.round(value * 100);

export const formatCompact = (value: number, locale = DEFAULT_LOCALE): string => new Intl.NumberFormat(locale, { notation: 'compact', compactDisplay: 'short' }).format(value);
export const formatPercent = (value: number, locale = DEFAULT_LOCALE): string => new Intl.NumberFormat(locale, { style: 'percent', minimumFractionDigits: 2 }).format(value);
