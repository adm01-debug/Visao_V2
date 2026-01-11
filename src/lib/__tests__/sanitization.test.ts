import { describe, it, expect } from 'vitest';
import {
  sanitizeHtml,
  sanitizeSql,
  sanitizeFilename,
  sanitizeUrl,
  sanitizeJson,
  stripHtml,
  escapeSpecialChars,
  sanitizeEmail,
  sanitizePhone,
} from '../sanitization';

describe('sanitization', () => {
  describe('sanitizeHtml', () => {
    it('should escape HTML tags', () => {
      expect(sanitizeHtml('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert("xss")&lt;/script&gt;');
    });

    it('should handle normal text', () => {
      expect(sanitizeHtml('Hello World')).toBe('Hello World');
    });
  });

  describe('sanitizeSql', () => {
    it('should remove dangerous characters', () => {
      expect(sanitizeSql("'; DROP TABLE users;--")).toBe(' DROP TABLE users--');
    });
  });

  describe('sanitizeFilename', () => {
    it('should remove dangerous characters', () => {
      expect(sanitizeFilename('../../../etc/passwd')).toBe('_.._._etc_passwd');
    });

    it('should limit length', () => {
      const longName = 'a'.repeat(300) + '.txt';
      expect(sanitizeFilename(longName).length).toBeLessThanOrEqual(255);
    });
  });

  describe('sanitizeUrl', () => {
    it('should accept valid URLs', () => {
      expect(sanitizeUrl('https://example.com')).toBe('https://example.com/');
    });

    it('should reject javascript URLs', () => {
      expect(sanitizeUrl('javascript:alert(1)')).toBe('');
    });

    it('should reject invalid URLs', () => {
      expect(sanitizeUrl('not a url')).toBe('');
    });
  });

  describe('sanitizeJson', () => {
    it('should parse valid JSON', () => {
      expect(sanitizeJson('{"a": 1}', {})).toEqual({ a: 1 });
    });

    it('should return default for invalid JSON', () => {
      expect(sanitizeJson('invalid', { default: true })).toEqual({ default: true });
    });
  });

  describe('stripHtml', () => {
    it('should remove all HTML tags', () => {
      expect(stripHtml('<p>Hello <b>World</b></p>')).toBe('Hello World');
    });
  });

  describe('escapeSpecialChars', () => {
    it('should escape HTML entities', () => {
      expect(escapeSpecialChars('<>&"\')).toBe('&lt;&gt;&amp;&quot;&#039;');
    });
  });

  describe('sanitizeEmail', () => {
    it('should accept valid email', () => {
      expect(sanitizeEmail('test@example.com')).toBe('test@example.com');
    });

    it('should reject invalid email', () => {
      expect(sanitizeEmail('not an email')).toBe('');
    });
  });

  describe('sanitizePhone', () => {
    it('should keep only digits and +', () => {
      expect(sanitizePhone('+1 (555) 123-4567')).toBe('+15551234567');
    });
  });
});
