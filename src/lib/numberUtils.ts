/**
 * Number Utilities
 * @module lib/numberUtils
 */

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function round(value: number, decimals = 2): number {
  return Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

export function percentage(value: number, total: number, decimals = 1): number {
  if (total === 0) return 0;
  return round((value / total) * 100, decimals);
}

export function average(numbers: number[]): number {
  if (numbers.length === 0) return 0;
  return numbers.reduce((a, b) => a + b, 0) / numbers.length;
}

export function sum(numbers: number[]): number {
  return numbers.reduce((a, b) => a + b, 0);
}

export function min(numbers: number[]): number {
  return Math.min(...numbers);
}

export function max(numbers: number[]): number {
  return Math.max(...numbers);
}

export function isEven(n: number): boolean {
  return n % 2 === 0;
}

export function isOdd(n: number): boolean {
  return n % 2 !== 0;
}

export function inRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

export default { clamp, round, percentage, average, sum, min, max, isEven, isOdd, inRange };
