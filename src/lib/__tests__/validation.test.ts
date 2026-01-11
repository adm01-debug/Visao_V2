import { describe, it, expect } from 'vitest';
import {
  isValidEmail,
  isValidPhone,
  isValidUrl,
  validatePassword,
  validateRequired,
  validateLength,
  validateRange,
  isFutureDate,
  isPastDate,
  isValidCPF,
  isValidCNPJ,
} from '../validation';

describe('validation', () => {
  describe('isValidEmail', () => {
    it('should accept valid emails', () => {
      expect(isValidEmail('test@example.com')).toBe(true);
      expect(isValidEmail('user.name@domain.org')).toBe(true);
    });

    it('should reject invalid emails', () => {
      expect(isValidEmail('invalid')).toBe(false);
      expect(isValidEmail('@domain.com')).toBe(false);
      expect(isValidEmail('user@')).toBe(false);
    });
  });

  describe('isValidPhone', () => {
    it('should accept valid phone numbers', () => {
      expect(isValidPhone('+5511999999999')).toBe(true);
      expect(isValidPhone('11999999999')).toBe(true);
    });

    it('should reject invalid phone numbers', () => {
      expect(isValidPhone('abc')).toBe(false);
      expect(isValidPhone('')).toBe(false);
    });
  });

  describe('isValidUrl', () => {
    it('should accept valid URLs', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('http://localhost:3000')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(isValidUrl('not-a-url')).toBe(false);
      expect(isValidUrl('ftp://example.com')).toBe(false);
    });
  });

  describe('validatePassword', () => {
    it('should pass for strong password', () => {
      const result = validatePassword('StrongP@ss1');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should fail for weak password', () => {
      const result = validatePassword('weak');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('validateRequired', () => {
    it('should pass when all required fields present', () => {
      const obj = { name: 'John', email: 'john@example.com' };
      const result = validateRequired(obj, ['name', 'email']);
      expect(result.valid).toBe(true);
    });

    it('should fail when required fields missing', () => {
      const obj = { name: 'John', email: '' };
      const result = validateRequired(obj, ['name', 'email']);
      expect(result.valid).toBe(false);
    });
  });

  describe('validateLength', () => {
    it('should validate string length', () => {
      expect(validateLength('hello', 1, 10)).toBe(true);
      expect(validateLength('hi', 5, 10)).toBe(false);
    });
  });

  describe('validateRange', () => {
    it('should validate number range', () => {
      expect(validateRange(5, 1, 10)).toBe(true);
      expect(validateRange(15, 1, 10)).toBe(false);
    });
  });

  describe('date validation', () => {
    it('should check future date', () => {
      const future = new Date(Date.now() + 86400000);
      expect(isFutureDate(future)).toBe(true);
    });

    it('should check past date', () => {
      const past = new Date(Date.now() - 86400000);
      expect(isPastDate(past)).toBe(true);
    });
  });

  describe('isValidCPF', () => {
    it('should validate correct CPF', () => {
      expect(isValidCPF('529.982.247-25')).toBe(true);
    });

    it('should reject invalid CPF', () => {
      expect(isValidCPF('111.111.111-11')).toBe(false);
      expect(isValidCPF('123.456.789-00')).toBe(false);
    });
  });

  describe('isValidCNPJ', () => {
    it('should validate correct CNPJ', () => {
      expect(isValidCNPJ('11.222.333/0001-81')).toBe(true);
    });

    it('should reject invalid CNPJ', () => {
      expect(isValidCNPJ('11.111.111/1111-11')).toBe(false);
    });
  });
});
