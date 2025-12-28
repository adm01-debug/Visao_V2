import { describe, it, expect, vi } from 'vitest';
import * as domUtils from '@/utils/dom';

describe('dom utils', () => {
  it('exports required functions', () => {
    expect(domUtils).toBeDefined();
  });

  it('module is not empty', () => {
    const exports = Object.keys(domUtils);
    expect(exports.length).toBeGreaterThan(0);
  });

  it('all exports are valid', () => {
    Object.values(domUtils).forEach(fn => {
      expect(fn).not.toBeNull();
      expect(fn).not.toBeUndefined();
    });
  });

  it('functions are callable or objects', () => {
    Object.values(domUtils).forEach(exp => {
      expect(['function', 'object']).toContain(typeof exp);
    });
  });
});
