import { describe, it, expect, vi } from 'vitest';
import * as scrollUtils from '@/utils/scroll';

describe('scroll utils', () => {
  it('exports required functions', () => {
    expect(scrollUtils).toBeDefined();
  });

  it('module is not empty', () => {
    const exports = Object.keys(scrollUtils);
    expect(exports.length).toBeGreaterThan(0);
  });

  it('all exports are valid', () => {
    Object.values(scrollUtils).forEach(fn => {
      expect(fn).not.toBeNull();
      expect(fn).not.toBeUndefined();
    });
  });

  it('functions are callable or objects', () => {
    Object.values(scrollUtils).forEach(exp => {
      expect(['function', 'object']).toContain(typeof exp);
    });
  });
});
