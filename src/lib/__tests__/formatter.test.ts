import { describe, it, expect } from 'vitest';
import { formatCurrency, formatPercentage, formatBytes, formatPhoneNumber, formatCPF, formatCNPJ } from '../formatter';

describe('formatter utilities', () => {
  describe('formatCurrency', () => {
    it('formats currency', () => {
      expect(formatCurrency(1234.56)).toContain('1');
      expect(formatCurrency(1234.56, 'BRL')).toContain('R$');
    });
  });

  describe('formatPercentage', () => {
    it('formats percentage', () => {
      expect(formatPercentage(0.5)).toBe('50%');
    });
  });

  describe('formatBytes', () => {
    it('formats bytes', () => {
      expect(formatBytes(1024)).toBe('1 KB');
      expect(formatBytes(1048576)).toBe('1 MB');
    });
  });

  describe('formatPhoneNumber', () => {
    it('formats phone number', () => {
      expect(formatPhoneNumber('11999999999')).toContain('(11)');
    });
  });

  describe('formatCPF', () => {
    it('formats CPF', () => {
      expect(formatCPF('12345678901')).toBe('123.456.789-01');
    });
  });

  describe('formatCNPJ', () => {
    it('formats CNPJ', () => {
      expect(formatCNPJ('12345678000195')).toBe('12.345.678/0001-95');
    });
  });
});
