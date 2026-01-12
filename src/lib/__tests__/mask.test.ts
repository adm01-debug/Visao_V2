import { describe, it, expect } from 'vitest';
import { maskCPF, maskCNPJ, maskPhone, maskCEP, maskDate, maskCreditCard } from '../mask';

describe('maskCPF', () => {
  it('should mask CPF', () => {
    expect(maskCPF('12345678909')).toBe('123.456.789-09');
    expect(maskCPF('123')).toBe('123');
  });
});

describe('maskCNPJ', () => {
  it('should mask CNPJ', () => {
    expect(maskCNPJ('11444777000161')).toBe('11.444.777/0001-61');
  });
});

describe('maskPhone', () => {
  it('should mask phone', () => {
    expect(maskPhone('11999887766')).toBe('(11) 99988-7766');
    expect(maskPhone('1199887766')).toBe('(11) 9988-7766');
  });
});

describe('maskCEP', () => {
  it('should mask CEP', () => {
    expect(maskCEP('01310100')).toBe('01310-100');
  });
});

describe('maskDate', () => {
  it('should mask date', () => {
    expect(maskDate('15012026')).toBe('15/01/2026');
  });
});

describe('maskCreditCard', () => {
  it('should mask credit card', () => {
    expect(maskCreditCard('4111111111111111')).toBe('4111 1111 1111 1111');
  });
});
