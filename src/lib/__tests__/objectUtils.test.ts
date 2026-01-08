import { describe, it, expect } from 'vitest';
import { pick, omit, merge, deepClone, isEmpty } from '../objectUtils';

describe('objectUtils', () => {
  describe('pick', () => {
    it('picks specified keys', () => {
      expect(pick({ a: 1, b: 2, c: 3 }, ['a', 'b'])).toEqual({ a: 1, b: 2 });
    });

    it('ignores missing keys', () => {
      expect(pick({ a: 1 }, ['a', 'b' as keyof { a: number }])).toEqual({ a: 1 });
    });
  });

  describe('omit', () => {
    it('omits specified keys', () => {
      expect(omit({ a: 1, b: 2, c: 3 }, ['b'])).toEqual({ a: 1, c: 3 });
    });
  });

  describe('merge', () => {
    it('merges objects', () => {
      expect(merge({ a: 1 }, { b: 2 })).toEqual({ a: 1, b: 2 });
    });

    it('overwrites existing keys', () => {
      expect(merge({ a: 1 }, { a: 2 })).toEqual({ a: 2 });
    });
  });

  describe('deepClone', () => {
    it('clones object', () => {
      const obj = { a: { b: 1 } };
      const clone = deepClone(obj);
      expect(clone).toEqual(obj);
      expect(clone).not.toBe(obj);
    });
  });

  describe('isEmpty', () => {
    it('returns true for empty object', () => {
      expect(isEmpty({})).toBe(true);
    });

    it('returns false for non-empty object', () => {
      expect(isEmpty({ a: 1 })).toBe(false);
    });
  });
});
