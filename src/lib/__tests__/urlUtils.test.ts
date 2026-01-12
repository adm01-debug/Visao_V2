import { describe, it, expect } from 'vitest';
import { buildUrl, isValidUrl, joinPaths, getUrlParts } from '../urlUtils';

describe('urlUtils', () => {
  describe('buildUrl', () => {
    it('should build URL with params', () => {
      const url = buildUrl('https://example.com', { page: 1, limit: 10 });
      expect(url).toContain('page=1');
      expect(url).toContain('limit=10');
    });

    it('should skip undefined params', () => {
      const url = buildUrl('https://example.com', { page: 1, limit: undefined as any });
      expect(url).toContain('page=1');
      expect(url).not.toContain('limit');
    });
  });

  describe('isValidUrl', () => {
    it('should return true for valid URLs', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('http://localhost:3000')).toBe(true);
    });

    it('should return false for invalid URLs', () => {
      expect(isValidUrl('not-a-url')).toBe(false);
      expect(isValidUrl('')).toBe(false);
    });
  });

  describe('joinPaths', () => {
    it('should join paths correctly', () => {
      expect(joinPaths('/api', 'users', '123')).toBe('/api/users/123');
      expect(joinPaths('api/', '/users/', '/123')).toBe('api/users/123');
    });
  });

  describe('getUrlParts', () => {
    it('should parse URL parts', () => {
      const parts = getUrlParts('https://example.com/path?query=1#hash');
      expect(parts.protocol).toBe('https:');
      expect(parts.host).toBe('example.com');
      expect(parts.pathname).toBe('/path');
      expect(parts.search).toBe('?query=1');
      expect(parts.hash).toBe('#hash');
    });
  });
});
