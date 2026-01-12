import { describe, it, expect } from 'vitest';
import { clamp, round, percentage, average, sum, min, max, isEven, isOdd, inRange } from '../numberUtils';

describe('numberUtils', () => {
  describe('clamp', () => {
    it('should clamp value within range', () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(15, 0, 10)).toBe(10);
    });
  });

  describe('round', () => {
    it('should round to specified decimals', () => {
      expect(round(3.14159, 2)).toBe(3.14);
      expect(round(3.14159, 4)).toBe(3.1416);
    });
  });

  describe('percentage', () => {
    it('should calculate percentage', () => {
      expect(percentage(25, 100)).toBe(25);
      expect(percentage(1, 3, 2)).toBe(33.33);
    });

    it('should return 0 for zero total', () => {
      expect(percentage(5, 0)).toBe(0);
    });
  });

  describe('average', () => {
    it('should calculate average', () => {
      expect(average([1, 2, 3, 4, 5])).toBe(3);
    });

    it('should return 0 for empty array', () => {
      expect(average([])).toBe(0);
    });
  });

  describe('sum', () => {
    it('should sum numbers', () => {
      expect(sum([1, 2, 3, 4, 5])).toBe(15);
    });
  });

  describe('min/max', () => {
    it('should find min and max', () => {
      expect(min([3, 1, 4, 1, 5])).toBe(1);
      expect(max([3, 1, 4, 1, 5])).toBe(5);
    });
  });

  describe('isEven/isOdd', () => {
    it('should check even/odd', () => {
      expect(isEven(4)).toBe(true);
      expect(isOdd(5)).toBe(true);
    });
  });

  describe('inRange', () => {
    it('should check if value is in range', () => {
      expect(inRange(5, 0, 10)).toBe(true);
      expect(inRange(15, 0, 10)).toBe(false);
    });
  });
});
