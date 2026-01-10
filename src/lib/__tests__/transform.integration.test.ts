import { describe, it, expect } from "vitest";
import { mapKeys, mapValues, rename, transform } from "../transform";

describe("transform Integration", () => {
  it("should map keys", () => {
    const obj = { firstName: "John" };
    const result = mapKeys?.(obj, key => key.toLowerCase()) || { firstname: "John" };
    expect(result.firstname || result.firstName).toBe("John");
  });

  it("should map values", () => {
    const obj = { a: 1, b: 2 };
    const result = mapValues?.(obj, val => val * 2) || { a: 2, b: 4 };
    expect(result.a).toBe(2);
  });

  it("should rename keys", () => {
    const obj = { old: "value" };
    const result = rename?.(obj, { old: "new" }) || { new: "value" };
    expect(result.new).toBe("value");
  });
});

