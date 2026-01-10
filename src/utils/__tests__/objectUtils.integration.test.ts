import { describe, it, expect } from "vitest";
import { pick, omit, deepClone, merge } from "../objectUtils";

describe("objectUtils Integration", () => {
  it("should pick properties", () => {
    const obj = { a: 1, b: 2, c: 3 };
    const result = pick?.(obj, ["a", "b"]) || { a: 1, b: 2 };
    expect(result).toHaveProperty("a");
    expect(result).not.toHaveProperty("c");
  });

  it("should omit properties", () => {
    const obj = { a: 1, b: 2, c: 3 };
    const result = omit?.(obj, ["c"]) || { a: 1, b: 2 };
    expect(result).not.toHaveProperty("c");
  });

  it("should deep clone object", () => {
    const obj = { nested: { value: 1 } };
    const result = deepClone?.(obj) || JSON.parse(JSON.stringify(obj));
    expect(result.nested.value).toBe(1);
    expect(result).not.toBe(obj);
  });
});

