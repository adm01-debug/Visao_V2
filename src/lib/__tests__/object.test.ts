import { describe, it, expect } from 'vitest';
import { pick, omit, deepMerge, deepClone, isEmpty, get, set } from '../object';

describe('object utilities', () => {
  describe('pick', () => {
    it('picks specified keys', () => {
      expect(pick({ a: 1, b: 2, c: 3 }, ['a', 'c'])).toEqual({ a: 1, c: 3 });
    });
  });

  describe('omit', () => {
    it('omits specified keys', () => {
      expect(omit({ a: 1, b: 2, c: 3 }, ['b'])).toEqual({ a: 1, c: 3 });
    });
  });

  describe('deepMerge', () => {
    it('merges objects deeply', () => {
      const a = { x: { y: 1 } };
      const b = { x: { z: 2 } };
      expect(deepMerge(a, b)).toEqual({ x: { y: 1, z: 2 } });
    });
  });

  describe('deepClone', () => {
    it('clones object deeply', () => {
      const obj = { a: { b: 1 } };
      const clone = deepClone(obj);
      clone.a.b = 2;
      expect(obj.a.b).toBe(1);
    });
  });

  describe('isEmpty', () => {
    it('detects empty object', () => {
      expect(isEmpty({})).toBe(true);
      expect(isEmpty({ a: 1 })).toBe(false);
    });
  });

  describe('get', () => {
    it('gets nested value', () => {
      expect(get({ a: { b: { c: 1 } } }, 'a.b.c')).toBe(1);
    });
    it('returns default for missing path', () => {
      expect(get({ a: 1 }, 'b.c', 'default')).toBe('default');
    });
  });

  describe('set', () => {
    it('sets nested value', () => {
      const obj = {};
      set(obj, 'a.b.c', 1);
      expect(obj).toEqual({ a: { b: { c: 1 } } });
    });
  });
});
