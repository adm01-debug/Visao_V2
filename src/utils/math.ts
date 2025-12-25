/**
 * Math Utilities
 */

export const clamp = (value: number, min: number, max: number): number => 
  Math.min(Math.max(value, min), max);

export const lerp = (start: number, end: number, t: number): number => 
  start + (end - start) * t;

export const inverseLerp = (start: number, end: number, value: number): number => 
  (value - start) / (end - start);

export const remap = (value: number, inMin: number, inMax: number, outMin: number, outMax: number): number =>
  lerp(outMin, outMax, inverseLerp(inMin, inMax, value));

export const round = (value: number, decimals = 0): number => 
  Math.round(value * 10 ** decimals) / 10 ** decimals;

export const floor = (value: number, decimals = 0): number => 
  Math.floor(value * 10 ** decimals) / 10 ** decimals;

export const ceil = (value: number, decimals = 0): number => 
  Math.ceil(value * 10 ** decimals) / 10 ** decimals;

export const sum = (arr: number[]): number => arr.reduce((a, b) => a + b, 0);

export const average = (arr: number[]): number => arr.length ? sum(arr) / arr.length : 0;

export const median = (arr: number[]): number => {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

export const standardDeviation = (arr: number[]): number => {
  const avg = average(arr);
  return Math.sqrt(average(arr.map(x => (x - avg) ** 2)));
};

export const min = (arr: number[]): number => Math.min(...arr);
export const max = (arr: number[]): number => Math.max(...arr);

export const percentage = (value: number, total: number): number => 
  total === 0 ? 0 : (value / total) * 100;

export const degToRad = (deg: number): number => deg * (Math.PI / 180);
export const radToDeg = (rad: number): number => rad * (180 / Math.PI);

export const distance = (x1: number, y1: number, x2: number, y2: number): number =>
  Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);

export const isPowerOfTwo = (n: number): boolean => n > 0 && (n & (n - 1)) === 0;

export const factorial = (n: number): number => n <= 1 ? 1 : n * factorial(n - 1);

export const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
export const lcm = (a: number, b: number): number => (a * b) / gcd(a, b);
