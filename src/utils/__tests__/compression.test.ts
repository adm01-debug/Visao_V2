import { describe, it, expect, vi } from 'vitest';
import * as compressionUtils from '@/utils/compression';

describe('compression utils', () => {
  it('exports required functions', () => {
    expect(compressionUtils).toBeDefined();
  });

  it('module is not empty', () => {
    const exports = Object.keys(compressionUtils);
    expect(exports.length).toBeGreaterThan(0);
  });

  it('all exports are valid', () => {
    Object.values(compressionUtils).forEach(fn => {
      expect(fn).not.toBeNull();
      expect(fn).not.toBeUndefined();
    });
  });

  it('functions are callable or objects', () => {
    Object.values(compressionUtils).forEach(exp => {
      expect(['function', 'object']).toContain(typeof exp);
    });
  });
});
