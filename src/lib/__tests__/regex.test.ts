import { describe, it, expect } from 'vitest';
import { isEmail, isUrl, isPhone, isIPv4, isUUID, escapeRegex, extractMatches } from '../regex';

describe('regex utilities', () => {
  describe('isEmail', () => {
    it('validates email', () => {
      expect(isEmail('test@example.com')).toBe(true);
      expect(isEmail('invalid')).toBe(false);
    });
  });

  describe('isUrl', () => {
    it('validates URL', () => {
      expect(isUrl('https://example.com')).toBe(true);
      expect(isUrl('not a url')).toBe(false);
    });
  });

  describe('isPhone', () => {
    it('validates phone number', () => {
      expect(isPhone('+1234567890')).toBe(true);
    });
  });

  describe('isIPv4', () => {
    it('validates IPv4 address', () => {
      expect(isIPv4('192.168.1.1')).toBe(true);
      expect(isIPv4('999.999.999.999')).toBe(false);
    });
  });

  describe('isUUID', () => {
    it('validates UUID', () => {
      expect(isUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
      expect(isUUID('invalid')).toBe(false);
    });
  });

  describe('escapeRegex', () => {
    it('escapes special characters', () => {
      expect(escapeRegex('a.b*c')).toBe('a\\.b\\*c');
    });
  });

  describe('extractMatches', () => {
    it('extracts all matches', () => {
      expect(extractMatches('a1b2c3', /\d/g)).toEqual(['1', '2', '3']);
    });
  });
});
