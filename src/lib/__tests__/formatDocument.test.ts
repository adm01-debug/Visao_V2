import { describe, it, expect } from 'vitest';
import { formatCPF, formatCNPJ, isValidCPF, isValidCNPJ } from '../formatDocument';

describe('formatCPF', () => {
  it('should format valid CPF', () => {
    expect(formatCPF('12345678909')).toBe('123.456.789-09');
  });
});

describe('formatCNPJ', () => {
  it('should format valid CNPJ', () => {
    expect(formatCNPJ('11444777000161')).toBe('11.444.777/0001-61');
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
    expect(isValidCNPJ('11.444.777/0001-61')).toBe(true);
  });

  it('should reject invalid CNPJ', () => {
    expect(isValidCNPJ('11.111.111/1111-11')).toBe(false);
  });
});
