/**
 * Formatter utilities
 */

export function formatCurrency(value: number, currency = "BRL"): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(value);
}

export function formatNumber(value: number, locale = "pt-BR"): string {
  return new Intl.NumberFormat(locale).format(value);
}

export function formatPercent(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "percent" }).format(value);
}

export function formatDate(date: Date, locale = "pt-BR"): string {
  return new Intl.DateTimeFormat(locale).format(date);
}

export function formatDateTime(date: Date, locale = "pt-BR"): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export default { formatCurrency, formatNumber, formatPercent, formatDate, formatDateTime };

