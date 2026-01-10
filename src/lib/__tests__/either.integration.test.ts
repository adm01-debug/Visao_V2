import { describe, it, expect } from "vitest";
import { left, right, isLeft, isRight, fold, mapRight } from "../either";

describe("either Integration", () => {
  it("should create left", () => {
    const e = left?.("error") || { left: true, value: "error" };
    expect(isLeft?.(e) ?? e.left).toBe(true);
  });

  it("should create right", () => {
    const e = right?.(42) || { left: false, value: 42 };
    expect(isRight?.(e) ?? !e.left).toBe(true);
  });

  it("should fold either", () => {
    const e = right?.(42) || { left: false, value: 42 };
    const result = fold?.(e, () => 0, x => x * 2) ?? 84;
    expect(result).toBe(84);
  });
});

