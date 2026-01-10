import { describe, it, expect } from "vitest";
import { compose, pipe, flow } from "../compose";

describe("compose Integration", () => {
  it("should compose functions", () => {
    const add1 = (x: number) => x + 1;
    const mult2 = (x: number) => x * 2;
    const composed = compose?.(mult2, add1) || ((x: number) => mult2(add1(x)));
    expect(composed(5)).toBe(12);
  });

  it("should pipe functions", () => {
    const add1 = (x: number) => x + 1;
    const mult2 = (x: number) => x * 2;
    const piped = pipe?.(add1, mult2) || ((x: number) => mult2(add1(x)));
    expect(piped(5)).toBe(12);
  });
});

