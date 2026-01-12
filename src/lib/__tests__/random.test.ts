import { describe, it, expect } from 'vitest';
import { randomInt, randomFloat, randomItem, shuffle, randomString, randomColor } from '../random';

describe('random', () => {
  describe('randomInt', () => {
    it('should return integer in range', () => {
      for (let i = 0; i < 100; i++) {
        const result = randomInt(1, 10);
        expect(result).toBeGreaterThanOrEqual(1);
        expect(result).toBeLessThanOrEqual(10);
        expect(Number.isInteger(result)).toBe(true);
      }
    });
  });

  describe('randomFloat', () => {
    it('should return float in range', () => {
      for (let i = 0; i < 100; i++) {
        const result = randomFloat(0, 1);
        expect(result).toBeGreaterThanOrEqual(0);
        expect(result).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('randomItem', () => {
    it('should return item from array', () => {
      const arr = [1, 2, 3, 4, 5];
      const result = randomItem(arr);
      expect(arr).toContain(result);
    });
  });

  describe('shuffle', () => {
    it('should return array with same elements', () => {
      const arr = [1, 2, 3, 4, 5];
      const result = shuffle(arr);
      expect(result.sort()).toEqual(arr.sort());
    });

    it('should not mutate original array', () => {
      const arr = [1, 2, 3, 4, 5];
      shuffle(arr);
      expect(arr).toEqual([1, 2, 3, 4, 5]);
    });
  });

  describe('randomString', () => {
    it('should return string of correct length', () => {
      const result = randomString(10);
      expect(result.length).toBe(10);
    });
  });

  describe('randomColor', () => {
    it('should return valid hex color', () => {
      const result = randomColor();
      expect(result).toMatch(/^#[0-9a-f]{6}$/i);
    });
  });
});
