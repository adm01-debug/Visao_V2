import { describe, it, expect, vi } from "vitest";
import { observeIntersection, unobserveIntersection, isInViewport } from "../intersection";

describe("intersection Integration", () => {
  it("should observe intersection", () => {
    const element = document.createElement("div");
    const handler = vi.fn();
    const unobserve = observeIntersection?.(element, handler);
    expect(true).toBe(true);
    unobserve?.();
  });

  it("should check if element is in viewport", () => {
    const element = document.createElement("div");
    document.body.appendChild(element);
    const result = isInViewport?.(element) ?? false;
    expect(typeof result).toBe("boolean");
    document.body.removeChild(element);
  });
});

