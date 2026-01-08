import { describe, it, expect } from 'vitest';
import { capitalize, truncate, slugify, removeAccents, maskEmail, maskPhone } from '../stringUtils';

describe('stringUtils', () => {
  describe('capitalize', () => {
    it('capitalizes first letter', () => {
      expect(capitalize('hello')).toBe('Hello');
    });

    it('handles empty string', () => {
      expect(capitalize('')).toBe('');
    });
  });

  describe('truncate', () => {
    it('truncates long strings', () => {
      expect(truncate('hello world', 5)).toBe('hello...');
    });

    it('keeps short strings unchanged', () => {
      expect(truncate('hi', 10)).toBe('hi');
    });
  });

  describe('slugify', () => {
    it('converts to slug', () => {
      expect(slugify('Hello World')).toBe('hello-world');
    });

    it('removes special chars', () => {
      expect(slugify('Test!@#')).toBe('test');
    });
  });

  describe('removeAccents', () => {
    it('removes accents', () => {
      expect(removeAccents('café')).toBe('cafe');
      expect(removeAccents('ação')).toBe('acao');
    });
  });

  describe('maskEmail', () => {
    it('masks email', () => {
      expect(maskEmail('user@example.com')).toBe('us***@example.com');
    });
  });

  describe('maskPhone', () => {
    it('masks phone', () => {
      expect(maskPhone('11999887766')).toBe('(11) *****-7766');
    });
  });
});
