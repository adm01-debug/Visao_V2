import { describe, it, expect } from 'vitest';
import { formatDate, getRelativeTime, isToday, isYesterday } from '../dateUtils';

describe('dateUtils', () => {
  describe('formatDate', () => {
    it('formats date with year', () => {
      const d = new Date('2024-01-15');
      expect(formatDate(d)).toContain('2024');
    });

    it('accepts string date', () => {
      expect(formatDate('2024-06-20')).toContain('2024');
    });

    it('supports long format', () => {
      const d = new Date('2024-01-15T14:30:00');
      const result = formatDate(d, 'long');
      expect(result).toBeDefined();
    });
  });

  describe('getRelativeTime', () => {
    it('returns "agora" for recent times', () => {
      const now = new Date();
      expect(getRelativeTime(now)).toBe('agora');
    });

    it('returns minutes for recent past', () => {
      const d = new Date(Date.now() - 5 * 60 * 1000);
      expect(getRelativeTime(d)).toContain('min');
    });
  });

  describe('isToday', () => {
    it('returns true for today', () => {
      expect(isToday(new Date())).toBe(true);
    });

    it('returns false for yesterday', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(isToday(yesterday)).toBe(false);
    });
  });

  describe('isYesterday', () => {
    it('returns true for yesterday', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      expect(isYesterday(yesterday)).toBe(true);
    });
  });
});
