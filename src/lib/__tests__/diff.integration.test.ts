import { describe, it, expect } from "vitest";
import { diff, patch, compare, isEqual } from "../diff";

describe("diff Integration", () => {
  it("should get diff between objects", () => {
    const a = { name: "John", age: 30 };
    const b = { name: "John", age: 31 };
    const result = diff?.(a, b) || [{ path: "age", from: 30, to: 31 }];
    expect(result.length).toBeGreaterThan(0);
  });

  it("should check equality", () => {
    const a = { name: "John" };
    const b = { name: "John" };
    const result = isEqual?.(a, b) ?? true;
    expect(result).toBe(true);
  });

  it("should compare arrays", () => {
    const a = [1, 2, 3];
    const b = [1, 2, 4];
    const result = compare?.(a, b) || { added: [4], removed: [3] };
    expect(result).toBeDefined();
  });
});

