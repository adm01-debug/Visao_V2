/**
 * Number utilities - Re-exports from @/utils/number
 * src/utils/number is the source of truth
 */

export {
  isNumber,
  isInteger,
  isPositive,
  isNegative,
  isZero,
  isEven,
  isOdd,
  toNumber,
  parseNumber,
  formatNumber,
  formatCompact,
  formatOrdinal,
  padZero,
  randomInt,
  randomFloat,
  inRange,
  toPercentage,
  fromPercentage,
  abbreviate,
} from '@/utils/number';

import {
  formatNumber as _formatNumber,
  randomInt,
  inRange,
} from '@/utils/number';

import { clamp, round } from '@/utils/math';

// Re-export from math for backward compatibility
export { clamp, round };

export function formatCurrency(value: number, currency = "BRL"): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency }).format(value);
}

export function formatPercent(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "percent" }).format(value);
}

export function random(min: number, max: number): number {
  return randomInt(min, max);
}

export default {
  clamp,
  round,
  random,
  formatNumber: _formatNumber,
  formatCurrency,
  formatPercent,
  inRange,
};
