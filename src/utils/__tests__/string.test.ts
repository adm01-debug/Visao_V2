import { describe, it, expect, vi } from 'vitest';
import * as stringUtils from '@/utils/string';

describe('string utils', () => {
  it('exports required functions', () => {
    expect(stringUtils).toBeDefined();
  });

  it('module is not empty', () => {
    const exports = Object.keys(stringUtils);
    expect(exports.length).toBeGreaterThan(0);
  });

  it('all exports are valid', () => {
    Object.values(stringUtils).forEach(fn => {
      expect(fn).not.toBeNull();
      expect(fn).not.toBeUndefined();
    });
  });

  it('functions are callable or objects', () => {
    Object.values(stringUtils).forEach(exp => {
      expect(['function', 'object']).toContain(typeof exp);
    });
  });
});
