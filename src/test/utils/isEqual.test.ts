import { describe, it, expect } from "vitest";
import { isEqual } from "@/utils/isEqual";

describe("isEqual (standalone)", () => {
  // Primitives
  it("equal numbers", () => expect(isEqual(1, 1)).toBe(true));
  it("unequal numbers", () => expect(isEqual(1, 2)).toBe(false));
  it("equal strings", () => expect(isEqual("a", "a")).toBe(true));
  it("unequal strings", () => expect(isEqual("a", "b")).toBe(false));
  it("booleans", () => { expect(isEqual(true, true)).toBe(true); expect(isEqual(true, false)).toBe(false); });
  it("null equality", () => expect(isEqual(null, null)).toBe(true));
  it("undefined equality", () => expect(isEqual(undefined, undefined)).toBe(true));
  it("null vs undefined", () => expect(isEqual(null, undefined)).toBe(false));
  it("different types", () => expect(isEqual(1, "1" as any)).toBe(false));
  it("NaN", () => expect(isEqual(NaN, NaN)).toBe(true));
  it("0 vs -0", () => expect(isEqual(0, -0)).toBe(true));

  // Arrays
  it("equal arrays", () => expect(isEqual([1, 2, 3], [1, 2, 3])).toBe(true));
  it("unequal arrays", () => expect(isEqual([1, 2], [1, 3])).toBe(false));
  it("different length arrays", () => expect(isEqual([1], [1, 2])).toBe(false));
  it("nested arrays", () => expect(isEqual([[1, [2]]], [[1, [2]]])).toBe(true));
  it("empty arrays", () => expect(isEqual([], [])).toBe(true));

  // Objects
  it("equal objects", () => expect(isEqual({ a: 1 }, { a: 1 })).toBe(true));
  it("unequal objects", () => expect(isEqual({ a: 1 }, { a: 2 })).toBe(false));
  it("different keys", () => expect(isEqual({ a: 1 }, { b: 1 })).toBe(false));
  it("nested objects", () => expect(isEqual({ a: { b: { c: 1 } } }, { a: { b: { c: 1 } } })).toBe(true));
  it("empty objects", () => expect(isEqual({}, {})).toBe(true));
  it("array vs object", () => expect(isEqual([] as any, {} as any)).toBe(false));

  // Complex
  it("complex nested structure", () => {
    const a = { users: [{ id: 1, tags: ["admin"] }], meta: { page: 1 } };
    const b = { users: [{ id: 1, tags: ["admin"] }], meta: { page: 1 } };
    expect(isEqual(a, b)).toBe(true);
  });
  it("complex nested difference", () => {
    const a = { users: [{ id: 1, tags: ["admin"] }] };
    const b = { users: [{ id: 1, tags: ["user"] }] };
    expect(isEqual(a, b)).toBe(false);
  });
});
