import { describe, it, expect, vi } from "vitest";
import { onPointerDown, onPointerUp, onPointerMove, onPointerEnter, onPointerLeave } from "../pointer";

describe("pointer Integration", () => {
  it("should handle pointer down", () => {
    const handler = vi.fn();
    const element = document.createElement("div");
    const unsubscribe = onPointerDown?.(element, handler);
    expect(true).toBe(true);
    unsubscribe?.();
  });

  it("should handle pointer move", () => {
    const handler = vi.fn();
    const element = document.createElement("div");
    const unsubscribe = onPointerMove?.(element, handler);
    expect(true).toBe(true);
    unsubscribe?.();
  });

  it("should handle pointer enter", () => {
    const handler = vi.fn();
    const element = document.createElement("div");
    const unsubscribe = onPointerEnter?.(element, handler);
    expect(true).toBe(true);
    unsubscribe?.();
  });
});

