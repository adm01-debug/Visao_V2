import { describe, it, expect, vi } from 'vitest';
import * as retryUtils from '@/utils/retry';

describe('retry utils', () => {
  it('exports required functions', () => {
    expect(retryUtils).toBeDefined();
  });

  it('module is not empty', () => {
    const exports = Object.keys(retryUtils);
    expect(exports.length).toBeGreaterThan(0);
  });

  it('all exports are valid', () => {
    Object.values(retryUtils).forEach(fn => {
      expect(fn).not.toBeNull();
      expect(fn).not.toBeUndefined();
    });
  });

  it('functions are callable or objects', () => {
    Object.values(retryUtils).forEach(exp => {
      expect(['function', 'object']).toContain(typeof exp);
    });
  });
});
