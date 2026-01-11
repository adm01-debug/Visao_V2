/**
 * Number utilities
 */

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function round(value: number, decimals = 0): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

export function random(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function formatNumber(value: number, locale = "pt-BR"): string {
  return new Intl.NumberFormat(locale).format(value);
}

export function formatCurrency(value: number, currency = "BRL"): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(value);
}

export function formatPercent(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "percent" }).format(value);
}

export default { clamp, round, random, formatNumber, formatCurrency, formatPercent };

