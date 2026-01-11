import { describe, it, expect } from 'vitest';
import { parseUrl, buildUrl, getQueryParam, setQueryParam, removeQueryParam, isAbsoluteUrl } from '../url';

describe('url utilities', () => {
  describe('parseUrl', () => {
    it('parses URL components', () => {
      const result = parseUrl('https://example.com:8080/path?q=1#hash');
      expect(result.host).toBe('example.com:8080');
      expect(result.pathname).toBe('/path');
    });
  });

  describe('buildUrl', () => {
    it('builds URL from components', () => {
      const url = buildUrl('https://example.com', '/path', { q: '1' });
      expect(url).toBe('https://example.com/path?q=1');
    });
  });

  describe('getQueryParam', () => {
    it('gets query parameter', () => {
      expect(getQueryParam('?a=1&b=2', 'a')).toBe('1');
    });
  });

  describe('setQueryParam', () => {
    it('sets query parameter', () => {
      expect(setQueryParam('?a=1', 'b', '2')).toContain('b=2');
    });
  });

  describe('removeQueryParam', () => {
    it('removes query parameter', () => {
      expect(removeQueryParam('?a=1&b=2', 'a')).not.toContain('a=1');
    });
  });

  describe('isAbsoluteUrl', () => {
    it('detects absolute URLs', () => {
      expect(isAbsoluteUrl('https://example.com')).toBe(true);
      expect(isAbsoluteUrl('/path')).toBe(false);
    });
  });
});
