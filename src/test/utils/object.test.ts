import { describe, it, expect } from "vitest";
import {
  isObject, isEmptyObject, pick, omit, get, set, merge, clone, equals,
  keys, values, entries, mapValues, filterObject,
} from "@/utils/object";

describe("object utils", () => {
  describe("isObject", () => {
    it("identifies objects", () => {
      expect(isObject({})).toBe(true);
      expect(isObject({ a: 1 })).toBe(true);
      expect(isObject(null)).toBe(false);
      expect(isObject([])).toBe(false);
      expect(isObject("str")).toBe(false);
      expect(isObject(42)).toBe(false);
      expect(isObject(undefined)).toBe(false);
    });
  });

  describe("isEmptyObject", () => {
    it("checks empty objects", () => {
      expect(isEmptyObject({})).toBe(true);
      expect(isEmptyObject({ a: 1 })).toBe(false);
    });
  });

  describe("pick / omit", () => {
    const obj = { a: 1, b: 2, c: 3, d: 4 };
    it("picks keys", () => {
      expect(pick(obj, ["a", "c"])).toEqual({ a: 1, c: 3 });
    });
    it("omits keys", () => {
      expect(omit(obj, ["b", "d"])).toEqual({ a: 1, c: 3 });
    });
  });

  describe("get", () => {
    const obj = { a: { b: { c: 42 } }, arr: [1, 2, 3] };
    it("gets nested values", () => {
      expect(get(obj, "a.b.c")).toBe(42);
      expect(get(obj, "a.b")).toEqual({ c: 42 });
    });
    it("returns default for missing paths", () => {
      expect(get(obj, "x.y.z", "default")).toBe("default");
      expect(get(obj, "a.b.d")).toBeUndefined();
    });
    it("handles array indices", () => {
      expect(get(obj, "arr[1]")).toBe(2);
    });
  });

  describe("set", () => {
    it("sets nested values immutably", () => {
      const obj = { a: { b: 1 } };
      const result = set(obj, "a.b", 42);
      expect(result.a.b).toBe(42);
      expect(obj.a.b).toBe(1); // original unchanged
    });
  });

  describe("merge", () => {
    it("deep merges objects", () => {
      const a = { x: 1, nested: { a: 1 } };
      const b = { y: 2, nested: { b: 2 } };
      expect(merge(a, b)).toEqual({ x: 1, y: 2, nested: { a: 1, b: 2 } });
    });
    it("later values override", () => {
      expect(merge({ a: 1 }, { a: 2 })).toEqual({ a: 2 });
    });
  });

  describe("clone", () => {
    it("deep clones", () => {
      const obj = { a: { b: [1, 2] } };
      const cloned = clone(obj);
      cloned.a.b.push(3);
      expect(obj.a.b).toEqual([1, 2]);
    });
  });

  describe("equals", () => {
    it("compares deep equality", () => {
      expect(equals({ a: 1 }, { a: 1 })).toBe(true);
      expect(equals({ a: 1 }, { a: 2 })).toBe(false);
      expect(equals([1, 2], [1, 2])).toBe(true);
    });
  });

  describe("keys / values / entries", () => {
    const obj = { a: 1, b: 2 };
    it("gets keys", () => expect(keys(obj).sort()).toEqual(["a", "b"]));
    it("gets values", () => expect(values(obj).sort()).toEqual([1, 2]));
    it("gets entries", () => expect(entries(obj).sort()).toEqual([["a", 1], ["b", 2]]));
  });

  describe("mapValues", () => {
    it("maps values", () => {
      expect(mapValues({ a: 1, b: 2 }, v => (v as number) * 2)).toEqual({ a: 2, b: 4 });
    });
  });

  describe("filterObject", () => {
    it("filters entries", () => {
      const obj = { a: 1, b: 2, c: 3 };
      expect(filterObject(obj, v => (v as number) > 1)).toEqual({ b: 2, c: 3 });
    });
  });
});
