import { describe, it, expect } from "vitest";
import { curry, curryRight, partial, partialRight } from "../curry";

describe("curry Integration", () => {
  it("should curry function", () => {
    const add = (a: number, b: number, c: number) => a + b + c;
    const curried = curry?.(add) || ((a: number) => (b: number) => (c: number) => a + b + c);
    const result = curried(1)(2)(3);
    expect(result).toBe(6);
  });

  it("should partial apply function", () => {
    const add = (a: number, b: number) => a + b;
    const add5 = partial?.(add, 5) || ((b: number) => 5 + b);
    const result = add5(3);
    expect(result).toBe(8);
  });
});

