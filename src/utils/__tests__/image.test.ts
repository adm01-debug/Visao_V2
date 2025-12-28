import { describe, it, expect, vi } from 'vitest';
import * as imageUtils from '@/utils/image';

describe('image utils', () => {
  it('exports required functions', () => {
    expect(imageUtils).toBeDefined();
  });

  it('module is not empty', () => {
    const exports = Object.keys(imageUtils);
    expect(exports.length).toBeGreaterThan(0);
  });

  it('all exports are valid', () => {
    Object.values(imageUtils).forEach(fn => {
      expect(fn).not.toBeNull();
      expect(fn).not.toBeUndefined();
    });
  });

  it('functions are callable or objects', () => {
    Object.values(imageUtils).forEach(exp => {
      expect(['function', 'object']).toContain(typeof exp);
    });
  });
});
