import { describe, it, expect } from 'vitest';
import { sum, average, min, max, median, standardDeviation, lerp, distance } from '../math';

describe('math utilities', () => {
  describe('sum', () => {
    it('sums array of numbers', () => {
      expect(sum([1, 2, 3, 4, 5])).toBe(15);
    });
  });

  describe('average', () => {
    it('calculates average', () => {
      expect(average([1, 2, 3, 4, 5])).toBe(3);
    });
  });

  describe('min', () => {
    it('finds minimum', () => {
      expect(min([3, 1, 4, 1, 5])).toBe(1);
    });
  });

  describe('max', () => {
    it('finds maximum', () => {
      expect(max([3, 1, 4, 1, 5])).toBe(5);
    });
  });

  describe('median', () => {
    it('finds median', () => {
      expect(median([1, 2, 3, 4, 5])).toBe(3);
    });
  });

  describe('lerp', () => {
    it('interpolates linearly', () => {
      expect(lerp(0, 10, 0.5)).toBe(5);
    });
  });

  describe('distance', () => {
    it('calculates distance between points', () => {
      expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
    });
  });
});
