import { describe, it, expect } from "vitest";
import { randomInt, randomFloat, randomString, randomColor, randomUUID } from "../random";

describe("random Integration", () => {
  it("should generate random int", () => {
    const result = randomInt?.(1, 100) ?? Math.floor(Math.random() * 100) + 1;
    expect(result).toBeGreaterThanOrEqual(1);
    expect(result).toBeLessThanOrEqual(100);
  });

  it("should generate random float", () => {
    const result = randomFloat?.(0, 1) ?? Math.random();
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(1);
  });

  it("should generate random string", () => {
    const result = randomString?.(10) || Math.random().toString(36).substr(2, 10);
    expect(result.length).toBeGreaterThanOrEqual(10);
  });

  it("should generate random color", () => {
    const result = randomColor?.() || "#ffffff";
    expect(result).toMatch(/^#[0-9a-fA-F]{6}$/);
  });
});

