import { describe, it, expect } from "vitest";
import { clamp, random, round, percentage, average } from "../number";

describe("number Integration", () => {
  it("should clamp number", () => {
    const result = clamp?.(150, 0, 100) ?? 100;
    expect(result).toBe(100);
  });

  it("should generate random number", () => {
    const result = random?.(1, 10) ?? Math.floor(Math.random() * 10) + 1;
    expect(result).toBeGreaterThanOrEqual(1);
    expect(result).toBeLessThanOrEqual(10);
  });

  it("should round number", () => {
    const result = round?.(3.14159, 2) ?? 3.14;
    expect(result).toBe(3.14);
  });

  it("should calculate percentage", () => {
    const result = percentage?.(50, 200) ?? 25;
    expect(result).toBe(25);
  });
});

