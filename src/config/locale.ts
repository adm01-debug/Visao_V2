/**
 * Configuração de locale para o sistema
 * Sistema exclusivamente em Português do Brasil
 */

export const LOCALE = 'pt-BR';
export const TIMEZONE = 'America/Sao_Paulo';

export const dateConfig = {
  locale: LOCALE,
  timezone: TIMEZONE,
  dateFormat: 'dd/MM/yyyy',
  timeFormat: 'HH:mm',
  dateTimeFormat: 'dd/MM/yyyy HH:mm',
};

export const numberConfig = {
  locale: LOCALE,
  currency: 'BRL',
  currencyDisplay: 'symbol' as const,
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
};

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat(LOCALE, {
    style: 'currency',
    currency: 'BRL',
    ...numberConfig,
  }).format(value);
};

export const formatDate = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(LOCALE, {
    dateStyle: 'short',
    timeZone: TIMEZONE,
  }).format(d);
};

export const formatDateTime = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat(LOCALE, {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: TIMEZONE,
  }).format(d);
};

export const formatNumber = (value: number): string => {
  return new Intl.NumberFormat(LOCALE).format(value);
};

export const formatPercent = (value: number): string => {
  return new Intl.NumberFormat(LOCALE, {
    style: 'percent',
    minimumFractionDigits: 1,
  }).format(value / 100);
};

export default {
  LOCALE,
  TIMEZONE,
  dateConfig,
  numberConfig,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
  formatPercent,
};
