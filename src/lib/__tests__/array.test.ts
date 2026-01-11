import { describe, it, expect } from 'vitest';
import { chunk, unique, flatten, groupBy, sortBy, shuffle, intersection, difference } from '../array';

describe('array utilities', () => {
  describe('chunk', () => {
    it('splits array into chunks', () => {
      expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    });
    it('handles empty array', () => {
      expect(chunk([], 2)).toEqual([]);
    });
  });

  describe('unique', () => {
    it('removes duplicates', () => {
      expect(unique([1, 2, 2, 3, 3, 3])).toEqual([1, 2, 3]);
    });
  });

  describe('flatten', () => {
    it('flattens nested arrays', () => {
      expect(flatten([[1, 2], [3, [4, 5]]])).toEqual([1, 2, 3, 4, 5]);
    });
  });

  describe('groupBy', () => {
    it('groups by key', () => {
      const arr = [{ type: 'a', val: 1 }, { type: 'b', val: 2 }, { type: 'a', val: 3 }];
      const result = groupBy(arr, 'type');
      expect(result.a).toHaveLength(2);
      expect(result.b).toHaveLength(1);
    });
  });

  describe('sortBy', () => {
    it('sorts by key', () => {
      const arr = [{ name: 'c' }, { name: 'a' }, { name: 'b' }];
      expect(sortBy(arr, 'name')).toEqual([{ name: 'a' }, { name: 'b' }, { name: 'c' }]);
    });
  });

  describe('intersection', () => {
    it('finds common elements', () => {
      expect(intersection([1, 2, 3], [2, 3, 4])).toEqual([2, 3]);
    });
  });

  describe('difference', () => {
    it('finds different elements', () => {
      expect(difference([1, 2, 3], [2, 3, 4])).toEqual([1]);
    });
  });
});
