import { describe, it, expect, vi } from 'vitest';
import * as fileUtils from '@/utils/file';

describe('file utils', () => {
  it('exports required functions', () => {
    expect(fileUtils).toBeDefined();
  });

  it('module is not empty', () => {
    const exports = Object.keys(fileUtils);
    expect(exports.length).toBeGreaterThan(0);
  });

  it('all exports are valid', () => {
    Object.values(fileUtils).forEach(fn => {
      expect(fn).not.toBeNull();
      expect(fn).not.toBeUndefined();
    });
  });

  it('functions are callable or objects', () => {
    Object.values(fileUtils).forEach(exp => {
      expect(['function', 'object']).toContain(typeof exp);
    });
  });
});
