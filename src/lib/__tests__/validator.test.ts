import { describe, it, expect } from 'vitest';
import { required, minLength, maxLength, email, url, pattern, compose } from '../validator';

describe('validator utilities', () => {
  describe('required', () => {
    it('validates required field', () => {
      expect(required('value')).toBe(true);
      expect(required('')).toBe(false);
      expect(required(null)).toBe(false);
    });
  });

  describe('minLength', () => {
    it('validates minimum length', () => {
      const validator = minLength(3);
      expect(validator('abc')).toBe(true);
      expect(validator('ab')).toBe(false);
    });
  });

  describe('maxLength', () => {
    it('validates maximum length', () => {
      const validator = maxLength(3);
      expect(validator('abc')).toBe(true);
      expect(validator('abcd')).toBe(false);
    });
  });

  describe('email', () => {
    it('validates email format', () => {
      expect(email('test@example.com')).toBe(true);
      expect(email('invalid')).toBe(false);
    });
  });

  describe('url', () => {
    it('validates URL format', () => {
      expect(url('https://example.com')).toBe(true);
      expect(url('not-a-url')).toBe(false);
    });
  });

  describe('compose', () => {
    it('composes multiple validators', () => {
      const validator = compose(required, minLength(3));
      expect(validator('abc')).toBe(true);
      expect(validator('')).toBe(false);
    });
  });
});
