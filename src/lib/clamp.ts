/**
 * Clamp utilities - Re-exports from @/utils/math
 * src/utils/math is the source of truth for clamp
 */

export { clamp } from '@/utils/math';

import { clamp as _clamp } from '@/utils/math';

export function clampPercentage(value: number): number {
  return _clamp(value, 0, 100);
}

export function clampOpacity(value: number): number {
  return _clamp(value, 0, 1);
}

export function clampArray<T>(arr: T[], maxLength: number): T[] {
  return arr.slice(0, maxLength);
}

export function clampString(str: string, maxLength: number, suffix = '...'): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - suffix.length) + suffix;
}

export default {
  clamp: _clamp,
  clampPercentage,
  clampOpacity,
  clampArray,
  clampString,
};
