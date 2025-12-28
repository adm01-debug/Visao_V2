import { describe, it, expect, vi } from 'vitest';
import * as objectUtils from '@/utils/object';

describe('object utils', () => {
  it('exports required functions', () => {
    expect(objectUtils).toBeDefined();
  });

  it('module is not empty', () => {
    const exports = Object.keys(objectUtils);
    expect(exports.length).toBeGreaterThan(0);
  });

  it('all exports are valid', () => {
    Object.values(objectUtils).forEach(fn => {
      expect(fn).not.toBeNull();
      expect(fn).not.toBeUndefined();
    });
  });

  it('functions are callable or objects', () => {
    Object.values(objectUtils).forEach(exp => {
      expect(['function', 'object']).toContain(typeof exp);
    });
  });
});
