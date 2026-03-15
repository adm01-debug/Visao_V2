import { describe, it, expect } from "vitest";
import {
  deepClone, deepMerge, deepEqual, deepGet, deepSet, deepUnset,
  deepHas, deepFlatten,
} from "@/utils/deep";

describe("deep utils", () => {
  describe("deepClone", () => {
    it("clones primitives", () => {
      expect(deepClone(42)).toBe(42);
      expect(deepClone("str")).toBe("str");
      expect(deepClone(null)).toBeNull();
    });
    it("clones objects deeply", () => {
      const obj = { a: { b: { c: 1 } }, d: [1, 2] };
      const cloned = deepClone(obj);
      cloned.a.b.c = 99;
      cloned.d.push(3);
      expect(obj.a.b.c).toBe(1);
      expect(obj.d).toEqual([1, 2]);
    });
    it("clones Date", () => {
      const d = new Date("2026-01-01");
      const cloned = deepClone(d);
      expect(cloned.getTime()).toBe(d.getTime());
      expect(cloned).not.toBe(d);
    });
    it("clones RegExp", () => {
      const r = /test/gi;
      const cloned = deepClone(r);
      expect(cloned.source).toBe("test");
      expect(cloned.flags).toContain("g");
      expect(cloned).not.toBe(r);
    });
    it("clones arrays", () => {
      const arr = [1, [2, [3]]];
      const cloned = deepClone(arr);
      (cloned[1] as number[])[0] = 99;
      expect((arr[1] as number[])[0]).toBe(2);
    });
  });

  describe("deepMerge", () => {
    it("merges nested objects", () => {
      const a = { x: 1, nested: { a: 1 } };
      const b = { y: 2, nested: { b: 2 } };
      const result = deepMerge(a, b);
      expect(result).toEqual({ x: 1, y: 2, nested: { a: 1, b: 2 } });
    });
    it("later values override", () => {
      expect(deepMerge({ a: 1 }, { a: 2 })).toEqual({ a: 2 });
    });
    it("does not mutate original", () => {
      const orig = { a: { b: 1 } };
      deepMerge(orig, { a: { c: 2 } } as any);
      expect(orig.a).toEqual({ b: 1 });
    });
    it("handles multiple sources", () => {
      const result = deepMerge({ a: 1 }, { b: 2 }, { c: 3 });
      expect(result).toEqual({ a: 1, b: 2, c: 3 });
    });
  });

  describe("deepEqual", () => {
    it("compares primitives", () => {
      expect(deepEqual(1, 1)).toBe(true);
      expect(deepEqual(1, 2)).toBe(false);
      expect(deepEqual("a", "a")).toBe(true);
      expect(deepEqual(null, null)).toBe(true);
      expect(deepEqual(null, undefined)).toBe(false);
    });
    it("compares objects", () => {
      expect(deepEqual({ a: 1, b: { c: 2 } }, { a: 1, b: { c: 2 } })).toBe(true);
      expect(deepEqual({ a: 1 }, { a: 2 })).toBe(false);
      expect(deepEqual({ a: 1 }, { a: 1, b: 2 } as any)).toBe(false);
    });
    it("compares arrays", () => {
      expect(deepEqual([1, 2, 3], [1, 2, 3])).toBe(true);
      expect(deepEqual([1, 2], [1, 2, 3])).toBe(false);
      expect(deepEqual([1, [2]], [1, [2]])).toBe(true);
    });
    it("handles mixed types", () => {
      expect(deepEqual(1, "1" as any)).toBe(false);
      expect(deepEqual([], {} as any)).toBe(false);
    });
  });

  describe("deepGet", () => {
    const obj = { a: { b: { c: 42 } }, arr: [1, 2, 3] };
    it("gets nested values", () => {
      expect(deepGet(obj, "a.b.c")).toBe(42);
      expect(deepGet(obj, "a.b")).toEqual({ c: 42 });
    });
    it("returns default for missing", () => {
      expect(deepGet(obj, "x.y.z", "default")).toBe("default");
      expect(deepGet(obj, "a.b.d")).toBeUndefined();
    });
    it("handles null in path", () => {
      expect(deepGet({ a: null }, "a.b", "nope")).toBe("nope");
    });
  });

  describe("deepSet", () => {
    it("sets nested values immutably", () => {
      const obj = { a: { b: 1 } };
      const result = deepSet(obj, "a.b", 42);
      expect(result.a.b).toBe(42);
      expect(obj.a.b).toBe(1);
    });
    it("creates intermediate objects", () => {
      const obj = {} as Record<string, unknown>;
      const result = deepSet(obj, "a.b.c", "deep");
      expect(deepGet(result, "a.b.c")).toBe("deep");
    });
  });

  describe("deepUnset", () => {
    it("removes nested keys", () => {
      const obj = { a: { b: 1, c: 2 } };
      const result = deepUnset(obj, "a.b");
      expect(result.a).toEqual({ c: 2 });
      expect(obj.a.b).toBe(1);
    });
    it("handles missing paths", () => {
      const obj = { a: 1 };
      const result = deepUnset(obj, "x.y.z");
      expect(result).toEqual({ a: 1 });
    });
  });

  describe("deepHas", () => {
    it("checks existence", () => {
      const obj = { a: { b: { c: null } } };
      expect(deepHas(obj, "a.b.c")).toBe(true);
      expect(deepHas(obj, "a.b.d")).toBe(false);
      expect(deepHas(obj, "x")).toBe(false);
    });
  });

  describe("deepFlatten", () => {
    it("flattens nested objects", () => {
      const obj = { a: 1, b: { c: 2, d: { e: 3 } } };
      expect(deepFlatten(obj)).toEqual({ a: 1, "b.c": 2, "b.d.e": 3 });
    });
    it("handles arrays as values", () => {
      const obj = { a: [1, 2] };
      const result = deepFlatten(obj);
      expect(result.a).toEqual([1, 2]);
    });
    it("handles empty object", () => {
      expect(deepFlatten({})).toEqual({});
    });
  });
});
