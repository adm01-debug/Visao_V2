/**
 * Random Utilities
 * @module lib/randomUtils
 */

export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randomFloat(min: number, max: number, decimals = 2): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

export function randomBoolean(): boolean {
  return Math.random() >= 0.5;
}

export function randomElement<T>(array: T[]): T {
  return array[randomInt(0, array.length - 1)];
}

export function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function randomColor(): string {
  return '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
}

export function randomString(length: number, charset = 'abcdefghijklmnopqrstuvwxyz0123456789'): string {
  return Array.from({ length }, () => charset[randomInt(0, charset.length - 1)]).join('');
}

export default { randomInt, randomFloat, randomBoolean, randomElement, shuffle, randomColor, randomString };
