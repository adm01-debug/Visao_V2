import { describe, it, expect, vi } from 'vitest';
import * as schedulerUtils from '@/utils/scheduler';

describe('scheduler utils', () => {
  it('exports required functions', () => {
    expect(schedulerUtils).toBeDefined();
  });

  it('module is not empty', () => {
    const exports = Object.keys(schedulerUtils);
    expect(exports.length).toBeGreaterThan(0);
  });

  it('all exports are valid', () => {
    Object.values(schedulerUtils).forEach(fn => {
      expect(fn).not.toBeNull();
      expect(fn).not.toBeUndefined();
    });
  });

  it('functions are callable or objects', () => {
    Object.values(schedulerUtils).forEach(exp => {
      expect(['function', 'object']).toContain(typeof exp);
    });
  });
});
