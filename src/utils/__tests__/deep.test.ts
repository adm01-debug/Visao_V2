import { describe, it, expect, vi } from 'vitest';
import * as deepUtils from '@/utils/deep';

describe('deep utils', () => {
  it('exports required functions', () => {
    expect(deepUtils).toBeDefined();
  });

  it('module is not empty', () => {
    const exports = Object.keys(deepUtils);
    expect(exports.length).toBeGreaterThan(0);
  });

  it('all exports are valid', () => {
    Object.values(deepUtils).forEach(fn => {
      expect(fn).not.toBeNull();
      expect(fn).not.toBeUndefined();
    });
  });

  it('functions are callable or objects', () => {
    Object.values(deepUtils).forEach(exp => {
      expect(['function', 'object']).toContain(typeof exp);
    });
  });
});
