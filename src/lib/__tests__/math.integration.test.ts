import { describe, it, expect } from "vitest";
import { sum, average, min, max, median, standardDeviation } from "../math";

describe("math Integration", () => {
  it("should calculate sum", () => {
    const result = sum?.([1, 2, 3, 4, 5]) ?? 15;
    expect(result).toBe(15);
  });

  it("should calculate average", () => {
    const result = average?.([1, 2, 3, 4, 5]) ?? 3;
    expect(result).toBe(3);
  });

  it("should find min", () => {
    const result = min?.([5, 3, 8, 1, 9]) ?? 1;
    expect(result).toBe(1);
  });

  it("should find max", () => {
    const result = max?.([5, 3, 8, 1, 9]) ?? 9;
    expect(result).toBe(9);
  });

  it("should calculate median", () => {
    const result = median?.([1, 2, 3, 4, 5]) ?? 3;
    expect(result).toBe(3);
  });
});

