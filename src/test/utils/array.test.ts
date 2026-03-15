import { describe, it, expect } from "vitest";
import {
  chunk, unique, uniqueBy, groupBy, sortBy, first, last, at,
  compact, truthy, difference, intersection, range, fill,
  sum, average, min, max, countBy, shuffle,
} from "@/utils/array";

describe("array utils", () => {
  describe("chunk", () => {
    it("splits array into chunks", () => {
      expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
      expect(chunk([1, 2, 3], 3)).toEqual([[1, 2, 3]]);
      expect(chunk([1, 2, 3], 1)).toEqual([[1], [2], [3]]);
      expect(chunk([], 2)).toEqual([]);
    });
    it("throws for invalid size", () => {
      expect(() => chunk([1], 0)).toThrow();
      expect(() => chunk([1], -1)).toThrow();
    });
  });

  describe("unique", () => {
    it("removes duplicates", () => {
      expect(unique([1, 2, 2, 3, 3, 3])).toEqual([1, 2, 3]);
      expect(unique(["a", "b", "a"])).toEqual(["a", "b"]);
      expect(unique([])).toEqual([]);
    });
  });

  describe("uniqueBy", () => {
    it("removes duplicates by key", () => {
      const items = [{ id: 1, name: "a" }, { id: 2, name: "b" }, { id: 1, name: "c" }];
      expect(uniqueBy(items, i => i.id)).toEqual([{ id: 1, name: "a" }, { id: 2, name: "b" }]);
    });
  });

  describe("groupBy", () => {
    it("groups items by key", () => {
      const items = [{ type: "a", v: 1 }, { type: "b", v: 2 }, { type: "a", v: 3 }];
      const grouped = groupBy(items, i => i.type);
      expect(grouped.a).toHaveLength(2);
      expect(grouped.b).toHaveLength(1);
    });
    it("handles empty array", () => {
      expect(groupBy([], () => "k")).toEqual({});
    });
  });

  describe("sortBy", () => {
    it("sorts by key function ascending", () => {
      const items = [{ n: 3 }, { n: 1 }, { n: 2 }];
      expect(sortBy(items, i => i.n)).toEqual([{ n: 1 }, { n: 2 }, { n: 3 }]);
    });
    it("sorts descending", () => {
      expect(sortBy([{ n: 1 }, { n: 3 }, { n: 2 }], i => i.n, "desc")).toEqual([{ n: 3 }, { n: 2 }, { n: 1 }]);
    });
    it("sorts by key name", () => {
      const items = [{ name: "c" }, { name: "a" }, { name: "b" }];
      expect(sortBy(items, "name")).toEqual([{ name: "a" }, { name: "b" }, { name: "c" }]);
    });
    it("does not mutate original", () => {
      const orig = [3, 1, 2].map(n => ({ n }));
      sortBy(orig, i => i.n);
      expect(orig[0].n).toBe(3);
    });
  });

  describe("shuffle", () => {
    it("returns same length", () => {
      const arr = [1, 2, 3, 4, 5];
      expect(shuffle(arr)).toHaveLength(5);
    });
    it("contains same elements", () => {
      const arr = [1, 2, 3, 4, 5];
      expect(shuffle(arr).sort()).toEqual([1, 2, 3, 4, 5]);
    });
    it("does not mutate original", () => {
      const arr = [1, 2, 3];
      shuffle(arr);
      expect(arr).toEqual([1, 2, 3]);
    });
  });

  describe("first / last / at", () => {
    it("gets first element", () => {
      expect(first([1, 2, 3])).toBe(1);
      expect(first([])).toBeUndefined();
    });
    it("gets last element", () => {
      expect(last([1, 2, 3])).toBe(3);
      expect(last([])).toBeUndefined();
    });
    it("gets element at index (including negative)", () => {
      expect(at([1, 2, 3], 0)).toBe(1);
      expect(at([1, 2, 3], -1)).toBe(3);
      expect(at([1, 2, 3], -2)).toBe(2);
      expect(at([1, 2, 3], 5)).toBeUndefined();
    });
  });

  describe("compact / truthy", () => {
    it("removes null/undefined", () => {
      expect(compact([1, null, 2, undefined, 3])).toEqual([1, 2, 3]);
      expect(compact([null, null])).toEqual([]);
    });
    it("removes all falsy", () => {
      expect(truthy([1, 0, "", false, null, undefined, 2])).toEqual([1, 2]);
    });
  });

  describe("difference / intersection", () => {
    it("computes difference", () => {
      expect(difference([1, 2, 3, 4], [2, 4])).toEqual([1, 3]);
      expect(difference([], [1, 2])).toEqual([]);
    });
    it("computes intersection", () => {
      expect(intersection([1, 2, 3], [2, 3, 4])).toEqual([2, 3]);
      expect(intersection([1], [2])).toEqual([]);
    });
  });

  describe("range", () => {
    it("generates ranges", () => {
      expect(range(0, 5)).toEqual([0, 1, 2, 3, 4]);
      expect(range(1, 4)).toEqual([1, 2, 3]);
      expect(range(0, 10, 3)).toEqual([0, 3, 6, 9]);
      expect(range(5, 5)).toEqual([]);
    });
    it("throws for zero step", () => {
      expect(() => range(0, 5, 0)).toThrow();
    });
  });

  describe("fill", () => {
    it("fills with value", () => {
      expect(fill(3, "x")).toEqual(["x", "x", "x"]);
      expect(fill(0, "x")).toEqual([]);
    });
    it("fills with function", () => {
      expect(fill(3, i => i * 2)).toEqual([0, 2, 4]);
    });
  });

  describe("sum / average / min / max", () => {
    it("calculates sum", () => {
      expect(sum([1, 2, 3])).toBe(6);
      expect(sum([])).toBe(0);
      expect(sum([-1, 1])).toBe(0);
    });
    it("calculates average", () => {
      expect(average([2, 4, 6])).toBe(4);
      expect(average([])).toBe(0);
    });
    it("finds min/max", () => {
      expect(min([3, 1, 2])).toBe(1);
      expect(max([3, 1, 2])).toBe(3);
      expect(min([])).toBeUndefined();
      expect(max([])).toBeUndefined();
    });
  });

  describe("countBy", () => {
    it("counts occurrences", () => {
      const items = ["a", "b", "a", "c", "b", "a"];
      expect(countBy(items, x => x)).toEqual({ a: 3, b: 2, c: 1 });
    });
  });
});
