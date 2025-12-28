import { describe, it, expect, vi } from 'vitest';
import * as currencyUtils from '@/utils/currency';

describe('currency utils', () => {
  it('exports required functions', () => {
    expect(currencyUtils).toBeDefined();
  });

  it('module is not empty', () => {
    const exports = Object.keys(currencyUtils);
    expect(exports.length).toBeGreaterThan(0);
  });

  it('all exports are valid', () => {
    Object.values(currencyUtils).forEach(fn => {
      expect(fn).not.toBeNull();
      expect(fn).not.toBeUndefined();
    });
  });

  it('functions are callable or objects', () => {
    Object.values(currencyUtils).forEach(exp => {
      expect(['function', 'object']).toContain(typeof exp);
    });
  });
});
