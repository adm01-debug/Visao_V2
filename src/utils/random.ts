/**
 * Random Utilities
 */

export const randomInt = (min: number, max: number): number =>
  Math.floor(Math.random() * (max - min + 1)) + min;

export const randomFloat = (min: number, max: number): number =>
  Math.random() * (max - min) + min;

export const randomBoolean = (probability = 0.5): boolean =>
  Math.random() < probability;

export const randomItem = <T>(array: T[]): T =>
  array[Math.floor(Math.random() * array.length)];

export const randomItems = <T>(array: T[], count: number): T[] => {
  const shuffled = shuffle([...array]);
  return shuffled.slice(0, Math.min(count, array.length));
};

export const shuffle = <T>(array: T[]): T[] => {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

export const randomString = (length: number, chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'): string =>
  Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join('');

export const randomHex = (length: number): string =>
  randomString(length, '0123456789abcdef');

export const randomAlpha = (length: number): string =>
  randomString(length, 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz');

export const randomNumeric = (length: number): string =>
  randomString(length, '0123456789');

export const randomColor = (): string =>
  `#${randomHex(6)}`;

export const randomRgb = (): { r: number; g: number; b: number } => ({
  r: randomInt(0, 255),
  g: randomInt(0, 255),
  b: randomInt(0, 255),
});

export const randomHsl = (): { h: number; s: number; l: number } => ({
  h: randomInt(0, 360),
  s: randomInt(0, 100),
  l: randomInt(0, 100),
});

export const randomDate = (start: Date, end: Date): Date =>
  new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));

export const weightedRandom = <T>(items: Array<{ value: T; weight: number }>): T => {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  let random = Math.random() * totalWeight;
  for (const item of items) {
    random -= item.weight;
    if (random <= 0) return item.value;
  }
  return items[items.length - 1].value;
};

export const randomGaussian = (mean = 0, stdDev = 1): number => {
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  return z * stdDev + mean;
};
