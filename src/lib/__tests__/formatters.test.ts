import { describe, it, expect } from 'vitest';
import { formatBytes, formatDuration, formatNumber, formatPercent, truncate } from '../formatters';

describe('formatters', () => {
  describe('formatNumber', () => {
    it('formats number with locale', () => {
      expect(formatNumber(1000)).toContain('1');
    });

    it('handles zero', () => {
      expect(formatNumber(0)).toBe('0');
    });
  });

  describe('formatBytes', () => {
    it('formats bytes correctly', () => {
      expect(formatBytes(0)).toBe('0 B');
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(1048576)).toBe('1 MB');
    });
  });

  describe('formatDuration', () => {
    it('formats seconds', () => {
      expect(formatDuration(30)).toBe('30s');
    });

    it('formats minutes', () => {
      expect(formatDuration(90)).toBe('1m 30s');
    });

    it('formats hours', () => {
      expect(formatDuration(3665)).toBe('1h 1m');
    });
  });

  describe('formatPercent', () => {
    it('formats percentage', () => {
      expect(formatPercent(75.5)).toBe('75.5%');
    });

    it('respects decimals parameter', () => {
      expect(formatPercent(75.555, 2)).toBe('75.56%');
    });
  });

  describe('truncate', () => {
    it('truncates long strings', () => {
      expect(truncate('hello world', 5)).toBe('hello...');
    });

    it('returns short strings unchanged', () => {
      expect(truncate('hi', 10)).toBe('hi');
    });
  });
});
