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
    currency: numberConfig.currency,
    minimumFractionDigits: numberConfig.minimumFractionDigits,
    maximumFractionDigits: numberConfig.maximumFractionDigits,
  }).format(value);
};

/**
 * `formatDate`/`formatDateTime` sempre renderizam em `timeZone: TIMEZONE`
 * (fixo), não no fuso do processo — este código pode rodar em edge function,
 * CI ou navegador, cada um com seu próprio fuso ambiente. Por isso, ao contrário
 * de `dateUtils.ts`, uma string 'YYYY-MM-DD' não pode ser ancorada em meia-noite
 * *local do processo* (isso reintroduz o bug sempre que o processo não estiver
 * em America/Sao_Paulo). Ancoramos em meio-dia UTC via `Date.UTC`, que nunca
 * consulta o fuso do host: com ±12h de folga, qualquer timeZone real (a faixa
 * de fusos existentes vai de UTC-12 a UTC+14) ainda resolve para o mesmo dia
 * civil ao formatar.
 */
const parseDateOnlyUTCSafe = (date: Date | string): Date => {
  if (date instanceof Date) return date;
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (dateOnly) {
    return new Date(
      Date.UTC(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]), 12)
    );
  }
  return new Date(date);
};

export const formatDate = (date: Date | string): string => {
  const d = parseDateOnlyUTCSafe(date);
  return new Intl.DateTimeFormat(LOCALE, {
    dateStyle: 'short',
    timeZone: TIMEZONE,
  }).format(d);
};

export const formatDateTime = (date: Date | string): string => {
  const d = parseDateOnlyUTCSafe(date);
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
