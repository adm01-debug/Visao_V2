/**
 * Clamp utilities
 * @module lib/clamp
 */

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function clampPercentage(value: number): number {
  return clamp(value, 0, 100);
}

export function clampOpacity(value: number): number {
  return clamp(value, 0, 1);
}

export function clampArray<T>(arr: T[], maxLength: number): T[] {
  return arr.slice(0, maxLength);
}

export function clampString(str: string, maxLength: number, suffix = '...'): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - suffix.length) + suffix;
}

export default { clamp, clampPercentage, clampOpacity, clampArray, clampString };
