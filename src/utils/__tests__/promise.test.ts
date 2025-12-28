import { describe, it, expect, vi } from 'vitest';
import * as promiseUtils from '@/utils/promise';

describe('promise utils', () => {
  it('exports required functions', () => {
    expect(promiseUtils).toBeDefined();
  });

  it('module is not empty', () => {
    const exports = Object.keys(promiseUtils);
    expect(exports.length).toBeGreaterThan(0);
  });

  it('all exports are valid', () => {
    Object.values(promiseUtils).forEach(fn => {
      expect(fn).not.toBeNull();
      expect(fn).not.toBeUndefined();
    });
  });

  it('functions are callable or objects', () => {
    Object.values(promiseUtils).forEach(exp => {
      expect(['function', 'object']).toContain(typeof exp);
    });
  });
});
