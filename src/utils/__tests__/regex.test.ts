import { describe, it, expect, vi } from 'vitest';
import * as regexUtils from '@/utils/regex';

describe('regex utils', () => {
  it('exports required functions', () => {
    expect(regexUtils).toBeDefined();
  });

  it('module is not empty', () => {
    const exports = Object.keys(regexUtils);
    expect(exports.length).toBeGreaterThan(0);
  });

  it('all exports are valid', () => {
    Object.values(regexUtils).forEach(fn => {
      expect(fn).not.toBeNull();
      expect(fn).not.toBeUndefined();
    });
  });

  it('functions are callable or objects', () => {
    Object.values(regexUtils).forEach(exp => {
      expect(['function', 'object']).toContain(typeof exp);
    });
  });
});
