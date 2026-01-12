import { describe, it, expect } from 'vitest';
import { randomInt, randomBoolean, randomElement, shuffle, randomColor } from '../randomUtils';

describe('randomInt', () => {
  it('returns number in range', () => {
    for (let i = 0; i < 100; i++) {
      const n = randomInt(1, 10);
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(10);
    }
  });
});

describe('randomBoolean', () => {
  it('returns boolean', () => {
    const result = randomBoolean();
    expect(typeof result).toBe('boolean');
  });
});

describe('randomElement', () => {
  it('returns element from array', () => {
    const arr = [1, 2, 3];
    const result = randomElement(arr);
    expect(arr).toContain(result);
  });
});

describe('shuffle', () => {
  it('returns array with same elements', () => {
    const arr = [1, 2, 3, 4, 5];
    const shuffled = shuffle(arr);
    expect(shuffled.sort()).toEqual(arr.sort());
  });
});

describe('randomColor', () => {
  it('returns valid hex color', () => {
    const color = randomColor();
    expect(color).toMatch(/^#[0-9a-f]{6}$/);
  });
});
