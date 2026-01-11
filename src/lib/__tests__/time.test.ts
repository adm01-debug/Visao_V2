import { describe, it, expect } from 'vitest';
import { formatTime, parseTime, addHours, subtractHours, formatDuration, sleep } from '../time';

describe('time utilities', () => {
  describe('formatTime', () => {
    it('formats time', () => {
      const date = new Date('2024-01-15T14:30:00');
      expect(formatTime(date)).toContain('14:30');
    });
  });

  describe('parseTime', () => {
    it('parses time string', () => {
      const result = parseTime('14:30');
      expect(result.hours).toBe(14);
      expect(result.minutes).toBe(30);
    });
  });

  describe('addHours', () => {
    it('adds hours to date', () => {
      const date = new Date('2024-01-15T10:00:00');
      const result = addHours(date, 5);
      expect(result.getHours()).toBe(15);
    });
  });

  describe('subtractHours', () => {
    it('subtracts hours from date', () => {
      const date = new Date('2024-01-15T10:00:00');
      const result = subtractHours(date, 5);
      expect(result.getHours()).toBe(5);
    });
  });

  describe('formatDuration', () => {
    it('formats duration in ms', () => {
      expect(formatDuration(3661000)).toContain('1h');
    });
  });

  describe('sleep', () => {
    it('returns promise', () => {
      expect(sleep(0)).toBeInstanceOf(Promise);
    });
  });
});
