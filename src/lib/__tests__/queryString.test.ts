import { describe, it, expect } from 'vitest';
import { parseQueryString, buildQueryString, updateQueryString } from '../queryString';

describe('queryString', () => {
  describe('parseQueryString', () => {
    it('should parse query string', () => {
      const result = parseQueryString('?name=John&age=30');
      expect(result).toEqual({ name: 'John', age: '30' });
    });

    it('should handle empty string', () => {
      const result = parseQueryString('');
      expect(result).toEqual({});
    });
  });

  describe('buildQueryString', () => {
    it('should build query string', () => {
      const result = buildQueryString({ name: 'John', age: 30 });
      expect(result).toBe('name=John&age=30');
    });

    it('should skip undefined values', () => {
      const result = buildQueryString({ name: 'John', age: undefined });
      expect(result).toBe('name=John');
    });
  });

  describe('updateQueryString', () => {
    it('should update existing params', () => {
      const result = updateQueryString('?name=John', { name: 'Jane' });
      expect(result).toBe('name=Jane');
    });

    it('should add new params', () => {
      const result = updateQueryString('?name=John', { age: 30 });
      expect(result).toContain('name=John');
      expect(result).toContain('age=30');
    });

    it('should remove params with undefined', () => {
      const result = updateQueryString('?name=John&age=30', { age: undefined });
      expect(result).toBe('name=John');
    });
  });
});
