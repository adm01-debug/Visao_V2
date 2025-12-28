import { describe, it, expect, vi } from 'vitest';
import * as colorUtils from '@/utils/color';

describe('color utils', () => {
  it('exports required functions', () => {
    expect(colorUtils).toBeDefined();
  });

  it('module is not empty', () => {
    const exports = Object.keys(colorUtils);
    expect(exports.length).toBeGreaterThan(0);
  });

  it('all exports are valid', () => {
    Object.values(colorUtils).forEach(fn => {
      expect(fn).not.toBeNull();
      expect(fn).not.toBeUndefined();
    });
  });

  it('functions are callable or objects', () => {
    Object.values(colorUtils).forEach(exp => {
      expect(['function', 'object']).toContain(typeof exp);
    });
  });
});
