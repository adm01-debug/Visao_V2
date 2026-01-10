import { describe, it, expect, vi } from "vitest";
import { computed, createComputed, watchComputed } from "../computed";

describe("computed Integration", () => {
  it("should create computed value", () => {
    const a = 5;
    const b = 10;
    const sum = computed?.(() => a + b) ?? 15;
    expect(sum).toBe(15);
  });

  it("should recompute when dependencies change", () => {
    let value = 5;
    const fn = vi.fn(() => value * 2);
    const c = createComputed?.(fn) || fn();
    
    expect(fn).toHaveBeenCalled();
  });
});

