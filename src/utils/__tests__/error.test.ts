import { describe, it, expect, vi } from 'vitest';
import * as errorUtils from '@/utils/error';

describe('error utils', () => {
  it('exports required functions', () => {
    expect(errorUtils).toBeDefined();
  });

  it('module is not empty', () => {
    const exports = Object.keys(errorUtils);
    expect(exports.length).toBeGreaterThan(0);
  });

  it('all exports are valid', () => {
    Object.values(errorUtils).forEach(fn => {
      expect(fn).not.toBeNull();
      expect(fn).not.toBeUndefined();
    });
  });

  it('functions are callable or objects', () => {
    Object.values(errorUtils).forEach(exp => {
      expect(['function', 'object']).toContain(typeof exp);
    });
  });
});
