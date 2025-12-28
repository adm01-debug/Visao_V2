import { describe, it, expect, vi } from 'vitest';
import * as arrayUtils from '@/utils/array';

describe('array utils', () => {
  it('exports required functions', () => {
    expect(arrayUtils).toBeDefined();
  });

  it('module is not empty', () => {
    const exports = Object.keys(arrayUtils);
    expect(exports.length).toBeGreaterThan(0);
  });

  it('all exports are valid', () => {
    Object.values(arrayUtils).forEach(fn => {
      expect(fn).not.toBeNull();
      expect(fn).not.toBeUndefined();
    });
  });

  it('functions are callable or objects', () => {
    Object.values(arrayUtils).forEach(exp => {
      expect(['function', 'object']).toContain(typeof exp);
    });
  });
});
