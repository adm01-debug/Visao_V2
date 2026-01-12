import { describe, it, expect } from 'vitest';
import { formatPhoneBR, formatPhoneUS, cleanPhone, isValidPhoneBR } from '../formatPhone';

describe('formatPhoneBR', () => {
  it('should format 11 digit phone', () => {
    expect(formatPhoneBR('11999887766')).toBe('(11) 99988-7766');
  });

  it('should format 10 digit phone', () => {
    expect(formatPhoneBR('1199887766')).toBe('(11) 9988-7766');
  });
});

describe('formatPhoneUS', () => {
  it('should format US phone', () => {
    expect(formatPhoneUS('1234567890')).toBe('(123) 456-7890');
  });
});

describe('cleanPhone', () => {
  it('should remove non-digits', () => {
    expect(cleanPhone('(11) 99988-7766')).toBe('11999887766');
  });
});

describe('isValidPhoneBR', () => {
  it('should validate BR phones', () => {
    expect(isValidPhoneBR('11999887766')).toBe(true);
    expect(isValidPhoneBR('123')).toBe(false);
  });
});
