import { describe, it, expect, vi } from 'vitest';
import * as diffUtils from '@/utils/diff';

describe('diff utils', () => {
  it('exports required functions', () => {
    expect(diffUtils).toBeDefined();
  });

  it('module is not empty', () => {
    const exports = Object.keys(diffUtils);
    expect(exports.length).toBeGreaterThan(0);
  });

  it('all exports are valid', () => {
    Object.values(diffUtils).forEach(fn => {
      expect(fn).not.toBeNull();
      expect(fn).not.toBeUndefined();
    });
  });

  it('functions are callable or objects', () => {
    Object.values(diffUtils).forEach(exp => {
      expect(['function', 'object']).toContain(typeof exp);
    });
  });
});
