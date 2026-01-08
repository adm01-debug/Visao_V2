import { describe, it, expect } from 'vitest';
import { unique, chunk, groupBy, sortBy } from '../arrayUtils';

describe('arrayUtils', () => {
  describe('unique', () => {
    it('removes duplicates', () => {
      expect(unique([1, 2, 2, 3])).toEqual([1, 2, 3]);
    });

    it('handles empty array', () => {
      expect(unique([])).toEqual([]);
    });

    it('supports key-based uniqueness', () => {
      const arr = [{ id: 1 }, { id: 2 }, { id: 1 }];
      expect(unique(arr, 'id')).toHaveLength(2);
    });
  });

  describe('chunk', () => {
    it('splits array into chunks', () => {
      expect(chunk([1, 2, 3, 4], 2)).toEqual([[1, 2], [3, 4]]);
    });

    it('handles uneven chunks', () => {
      expect(chunk([1, 2, 3], 2)).toEqual([[1, 2], [3]]);
    });
  });

  describe('groupBy', () => {
    it('groups by key', () => {
      const arr = [
        { type: 'a', value: 1 },
        { type: 'b', value: 2 },
        { type: 'a', value: 3 },
      ];
      const grouped = groupBy(arr, 'type');
      expect(grouped['a']).toHaveLength(2);
      expect(grouped['b']).toHaveLength(1);
    });
  });

  describe('sortBy', () => {
    it('sorts ascending', () => {
      const arr = [{ n: 3 }, { n: 1 }, { n: 2 }];
      expect(sortBy(arr, 'n')[0].n).toBe(1);
    });

    it('sorts descending', () => {
      const arr = [{ n: 1 }, { n: 3 }, { n: 2 }];
      expect(sortBy(arr, 'n', 'desc')[0].n).toBe(3);
    });
  });
});
