import { describe, it, expect } from 'vitest';
import { clamp, round, random, formatNumber, percentage, isEven, isOdd } from '../number';

describe('number utilities', () => {
  describe('clamp', () => {
    it('clamps value within range', () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(15, 0, 10)).toBe(10);
    });
  });

  describe('round', () => {
    it('rounds to decimal places', () => {
      expect(round(3.14159, 2)).toBe(3.14);
      expect(round(3.145, 2)).toBe(3.15);
    });
  });

  describe('random', () => {
    it('generates random number in range', () => {
      const num = random(1, 10);
      expect(num).toBeGreaterThanOrEqual(1);
      expect(num).toBeLessThanOrEqual(10);
    });
  });

  describe('formatNumber', () => {
    it('formats number with separators', () => {
      expect(formatNumber(1000000)).toBe('1,000,000');
    });
  });

  describe('percentage', () => {
    it('calculates percentage', () => {
      expect(percentage(50, 200)).toBe(25);
    });
  });

  describe('isEven', () => {
    it('detects even numbers', () => {
      expect(isEven(2)).toBe(true);
      expect(isEven(3)).toBe(false);
    });
  });

  describe('isOdd', () => {
    it('detects odd numbers', () => {
      expect(isOdd(3)).toBe(true);
      expect(isOdd(2)).toBe(false);
    });
  });
});
