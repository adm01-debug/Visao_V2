import { describe, it, expect } from 'vitest';
import { formatDate, parseDate, addDays, subtractDays, diffDays, isToday, isFuture, isPast } from '../date';

describe('date utilities', () => {
  describe('formatDate', () => {
    it('formats date', () => {
      const date = new Date('2024-01-15');
      expect(formatDate(date, 'YYYY-MM-DD')).toBe('2024-01-15');
    });
  });

  describe('parseDate', () => {
    it('parses date string', () => {
      const date = parseDate('2024-01-15');
      expect(date.getFullYear()).toBe(2024);
    });
  });

  describe('addDays', () => {
    it('adds days to date', () => {
      const date = new Date('2024-01-15');
      const result = addDays(date, 5);
      expect(result.getDate()).toBe(20);
    });
  });

  describe('subtractDays', () => {
    it('subtracts days from date', () => {
      const date = new Date('2024-01-15');
      const result = subtractDays(date, 5);
      expect(result.getDate()).toBe(10);
    });
  });

  describe('diffDays', () => {
    it('calculates difference in days', () => {
      const date1 = new Date('2024-01-15');
      const date2 = new Date('2024-01-20');
      expect(diffDays(date1, date2)).toBe(5);
    });
  });

  describe('isToday', () => {
    it('detects today', () => {
      expect(isToday(new Date())).toBe(true);
    });
  });

  describe('isFuture', () => {
    it('detects future date', () => {
      const future = new Date();
      future.setDate(future.getDate() + 1);
      expect(isFuture(future)).toBe(true);
    });
  });

  describe('isPast', () => {
    it('detects past date', () => {
      const past = new Date();
      past.setDate(past.getDate() - 1);
      expect(isPast(past)).toBe(true);
    });
  });
});
