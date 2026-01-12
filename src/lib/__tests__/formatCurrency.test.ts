import { describe, it, expect } from 'vitest';
import { formatCurrency, parseCurrency, formatCompact } from '../formatCurrency';

describe('formatCurrency', () => {
  it('should format BRL', () => {
    expect(formatCurrency(1234.56, 'BRL')).toContain('1.234,56');
  });

  it('should format USD', () => {
    expect(formatCurrency(1234.56, 'USD')).toContain('1,234.56');
  });
});

describe('parseCurrency', () => {
  it('should parse BRL format', () => {
    expect(parseCurrency('R$ 1.234,56')).toBe(1234.56);
  });
});

describe('formatCompact', () => {
  it('should format thousands', () => {
    expect(formatCompact(1500)).toBe('1.5K');
  });

  it('should format millions', () => {
    expect(formatCompact(1500000)).toBe('1.5M');
  });

  it('should format billions', () => {
    expect(formatCompact(1500000000)).toBe('1.5B');
  });
});
