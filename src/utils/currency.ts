/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Currency Utilities - Formatação de moeda e números
 * 
 * @module utils/currency
 */

// ============================================
// CONSTANTES
// ============================================

const DEFAULT_LOCALE = 'pt-BR';
const DEFAULT_CURRENCY = 'BRL';

// ============================================
// TIPOS
// ============================================

export type CurrencyCode = 'BRL' | 'USD' | 'EUR' | 'GBP' | 'JPY';
export type Locale = 'pt-BR' | 'en-US' | 'es-ES' | 'fr-FR' | 'de-DE' | 'ja-JP';

export interface FormatOptions {
  locale?: Locale;
  currency?: CurrencyCode;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}

// ============================================
// FORMATAÇÃO DE MOEDA
// ============================================

/**
 * Formatar valor como moeda
 * @param value Valor numérico
 * @param currency Código da moeda
 * @param locale Localidade
 */
export const formatCurrency = (
  value: number,
  currency: CurrencyCode = DEFAULT_CURRENCY,
  locale: Locale = DEFAULT_LOCALE
): string => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(value);
};

/**
 * Formatar valor com opções customizadas
 * @param value Valor numérico
 * @param options Opções de formatação
 */
export const formatCurrencyAdvanced = (
  value: number,
  options: FormatOptions = {}
): string => {
  const {
    locale = DEFAULT_LOCALE,
    currency = DEFAULT_CURRENCY,
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
  } = options;
  
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(value);
};

/**
 * Parsear string de moeda para número
 * @param value String formatada como moeda
 */
export const parseCurrency = (value: string): number => {
  // Remover tudo exceto dígitos, vírgula, ponto e sinal negativo
  const cleaned = value.replace(/[^\d,.-]/g, '');
  
  // Converter formato brasileiro (1.234,56) para padrão (1234.56)
  if (cleaned.includes(',') && cleaned.includes('.')) {
    // Formato com separador de milhar e decimal
    if (cleaned.indexOf('.') < cleaned.indexOf(',')) {
      // Brasileiro: 1.234,56
      return parseFloat(cleaned.replace(/\./g, '').replace(',', '.'));
    }
    // Americano: 1,234.56
    return parseFloat(cleaned.replace(/,/g, ''));
  }
  
  // Apenas vírgula - assumir decimal brasileiro
  if (cleaned.includes(',')) {
    return parseFloat(cleaned.replace(',', '.'));
  }
  
  return parseFloat(cleaned);
};

// ============================================
// CONVERSÃO CENTAVOS
// ============================================

/**
 * Converter centavos para valor monetário
 * @param cents Valor em centavos
 */
export const centsToCurrency = (cents: number): number => {
  return cents / 100;
};

/**
 * Converter valor monetário para centavos
 * @param value Valor monetário
 */
export const currencyToCents = (value: number): number => {
  return Math.round(value * 100);
};

// ============================================
// FORMATAÇÃO COMPACTA
// ============================================

/**
 * Formatar número de forma compacta (1K, 1M, 1B)
 * @param value Valor numérico
 * @param locale Localidade
 */
export const formatCompact = (
  value: number,
  locale: Locale = DEFAULT_LOCALE
): string => {
  return new Intl.NumberFormat(locale, {
    notation: 'compact',
    compactDisplay: 'short',
  }).format(value);
};

/**
 * Formatar número de forma compacta longa
 * @param value Valor numérico
 * @param locale Localidade
 */
export const formatCompactLong = (
  value: number,
  locale: Locale = DEFAULT_LOCALE
): string => {
  return new Intl.NumberFormat(locale, {
    notation: 'compact',
    compactDisplay: 'long',
  }).format(value);
};

// ============================================
// FORMATAÇÃO DE PORCENTAGEM
// ============================================

/**
 * Formatar número como porcentagem
 * @param value Valor decimal (0.5 = 50%)
 * @param locale Localidade
 */
export const formatPercent = (
  value: number,
  locale: Locale = DEFAULT_LOCALE,
  decimals = 2
): string => {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

// ============================================
// FORMATAÇÃO DE NÚMEROS
// ============================================

/**
 * Formatar número com separadores
 * @param value Valor numérico
 * @param locale Localidade
 */
export const formatNumber = (
  value: number,
  locale: Locale = DEFAULT_LOCALE
): string => {
  return new Intl.NumberFormat(locale).format(value);
};

/**
 * Formatar número com decimais específicos
 * @param value Valor numérico
 * @param decimals Número de casas decimais
 * @param locale Localidade
 */
export const formatDecimal = (
  value: number,
  decimals: number,
  locale: Locale = DEFAULT_LOCALE
): string => {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
};

// ============================================
// CÁLCULOS FINANCEIROS
// ============================================

/**
 * Calcular desconto
 * @param value Valor original
 * @param discountPercent Porcentagem de desconto
 */
export const calculateDiscount = (
  value: number,
  discountPercent: number
): { discount: number; final: number } => {
  const discount = value * (discountPercent / 100);
  return {
    discount: Math.round(discount * 100) / 100,
    final: Math.round((value - discount) * 100) / 100,
  };
};

/**
 * Calcular valor com imposto
 * @param value Valor base
 * @param taxPercent Porcentagem de imposto
 */
export const calculateWithTax = (
  value: number,
  taxPercent: number
): { tax: number; total: number } => {
  const tax = value * (taxPercent / 100);
  return {
    tax: Math.round(tax * 100) / 100,
    total: Math.round((value + tax) * 100) / 100,
  };
};

// ============================================
// EXPORT DEFAULT
// ============================================

export default {
  formatCurrency,
  formatCurrencyAdvanced,
  parseCurrency,
  centsToCurrency,
  currencyToCents,
  formatCompact,
  formatCompactLong,
  formatPercent,
  formatNumber,
  formatDecimal,
  calculateDiscount,
  calculateWithTax,
};
