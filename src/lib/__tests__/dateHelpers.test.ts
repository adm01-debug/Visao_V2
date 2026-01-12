import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  formatDistanceToNow, isSameDay, isBefore, isAfter, isBetween,
  getDaysInMonth, getFirstDayOfMonth,
} from '../dateHelpers';

describe('dateHelpers', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-15T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('formatDistanceToNow', () => {
    it('should return "agora" for recent dates', () => {
      const date = new Date('2026-01-15T11:59:30Z');
      expect(formatDistanceToNow(date)).toBe('agora');
    });

    it('should return minutes for recent dates', () => {
      const date = new Date('2026-01-15T11:55:00Z');
      expect(formatDistanceToNow(date)).toBe('5 minutos atrás');
    });

    it('should return hours for older dates', () => {
      const date = new Date('2026-01-15T10:00:00Z');
      expect(formatDistanceToNow(date)).toBe('2 horas atrás');
    });
  });

  describe('isSameDay', () => {
    it('should return true for same day', () => {
      const date1 = new Date('2026-01-15T10:00:00Z');
      const date2 = new Date('2026-01-15T15:00:00Z');
      expect(isSameDay(date1, date2)).toBe(true);
    });

    it('should return false for different days', () => {
      const date1 = new Date('2026-01-15T10:00:00Z');
      const date2 = new Date('2026-01-16T10:00:00Z');
      expect(isSameDay(date1, date2)).toBe(false);
    });
  });

  describe('isBefore/isAfter', () => {
    it('should compare dates correctly', () => {
      const date1 = new Date('2026-01-10');
      const date2 = new Date('2026-01-15');
      
      expect(isBefore(date1, date2)).toBe(true);
      expect(isAfter(date2, date1)).toBe(true);
    });
  });

  describe('isBetween', () => {
    it('should check if date is in range', () => {
      const date = new Date('2026-01-15');
      const start = new Date('2026-01-10');
      const end = new Date('2026-01-20');
      
      expect(isBetween(date, start, end)).toBe(true);
    });
  });

  describe('getDaysInMonth', () => {
    it('should return correct days', () => {
      expect(getDaysInMonth(2026, 0)).toBe(31); // January
      expect(getDaysInMonth(2026, 1)).toBe(28); // February
    });
  });
});
