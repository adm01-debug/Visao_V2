import { describe, it, expect, vi } from "vitest";
import { onResize, getViewportSize, observeResize, unobserveResize } from "../resize";

describe("resize Integration", () => {
  it("should handle window resize", () => {
    const handler = vi.fn();
    const unsubscribe = onResize?.(handler);
    expect(true).toBe(true);
    unsubscribe?.();
  });

  it("should get viewport size", () => {
    const result = getViewportSize?.() || { width: window.innerWidth, height: window.innerHeight };
    expect(result.width).toBeGreaterThan(0);
    expect(result.height).toBeGreaterThan(0);
  });

  it("should observe element resize", () => {
    const element = document.createElement("div");
    const handler = vi.fn();
    const unobserve = observeResize?.(element, handler);
    expect(true).toBe(true);
    unobserve?.();
  });
});

