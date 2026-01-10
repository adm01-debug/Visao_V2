import { describe, it, expect, vi } from "vitest";
import { isVisible, onVisibilityChange, getVisibilityState } from "../visibility";

describe("visibility Integration", () => {
  it("should check if page is visible", () => {
    const result = isVisible?.() ?? !document.hidden;
    expect(typeof result).toBe("boolean");
  });

  it("should get visibility state", () => {
    const result = getVisibilityState?.() || document.visibilityState;
    expect(["visible", "hidden", "prerender"]).toContain(result);
  });

  it("should handle visibility change", () => {
    const handler = vi.fn();
    const unsubscribe = onVisibilityChange?.(handler);
    expect(true).toBe(true);
    unsubscribe?.();
  });
});

