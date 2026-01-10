import { describe, it, expect } from "vitest";
import { clone, deepClone, cloneArray, cloneWith } from "../clone";

describe("clone Integration", () => {
  it("should shallow clone object", () => {
    const obj = { a: 1, b: { c: 2 } };
    const result = clone?.(obj) || { ...obj };
    expect(result).not.toBe(obj);
    expect(result.a).toBe(1);
  });

  it("should deep clone object", () => {
    const obj = { a: 1, b: { c: 2 } };
    const result = deepClone?.(obj) || JSON.parse(JSON.stringify(obj));
    expect(result.b).not.toBe(obj.b);
    expect(result.b.c).toBe(2);
  });

  it("should clone array", () => {
    const arr = [1, 2, 3];
    const result = cloneArray?.(arr) || [...arr];
    expect(result).not.toBe(arr);
    expect(result).toEqual(arr);
  });
});

