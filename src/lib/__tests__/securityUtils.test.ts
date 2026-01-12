import { describe, it, expect } from 'vitest';
import { generateCSRFToken, sanitizeInput, validatePassword } from '../securityUtils';

describe('securityUtils', () => {
  describe('generateCSRFToken', () => {
    it('should generate unique tokens', () => {
      const token1 = generateCSRFToken();
      const token2 = generateCSRFToken();
      
      expect(token1).not.toBe(token2);
      expect(token1.length).toBe(64);
    });
  });

  describe('sanitizeInput', () => {
    it('should escape HTML entities', () => {
      expect(sanitizeInput('<script>')).toBe('&lt;script&gt;');
      expect(sanitizeInput('"test"')).toBe('&quot;test&quot;');
      expect(sanitizeInput("'test'")).toBe('&#x27;test&#x27;');
    });
  });

  describe('validatePassword', () => {
    it('should validate strong password', () => {
      const result = validatePassword('Test123!@');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject weak password', () => {
      const result = validatePassword('weak');
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should check all requirements', () => {
      const result = validatePassword('test');
      expect(result.errors).toContain('Mínimo 8 caracteres');
      expect(result.errors).toContain('Precisa de letra maiúscula');
      expect(result.errors).toContain('Precisa de número');
      expect(result.errors).toContain('Precisa de caractere especial');
    });
  });
});
