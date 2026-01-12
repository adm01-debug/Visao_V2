/**
 * Currency Formatting Utilities
 * @module lib/formatCurrency
 */

type Currency = 'BRL' | 'USD' | 'EUR';

const formatters: Record<Currency, Intl.NumberFormat> = {
  BRL: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }),
  USD: new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }),
  EUR: new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }),
};

export function formatCurrency(value: number, currency: Currency = 'BRL'): string {
  return formatters[currency].format(value);
}

export function parseCurrency(value: string): number {
  const cleaned = value.replace(/[^0-9,-]/g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
}

export function formatCompact(value: number): string {
  if (value >= 1e9) return (value / 1e9).toFixed(1) + 'B';
  if (value >= 1e6) return (value / 1e6).toFixed(1) + 'M';
  if (value >= 1e3) return (value / 1e3).toFixed(1) + 'K';
  return value.toString();
}

export default { formatCurrency, parseCurrency, formatCompact };
