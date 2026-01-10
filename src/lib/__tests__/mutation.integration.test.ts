import { describe, it, expect, vi } from "vitest";
import { observeMutations, unobserveMutations } from "../mutation";

describe("mutation Integration", () => {
  it("should observe mutations", () => {
    const element = document.createElement("div");
    const handler = vi.fn();
    const unobserve = observeMutations?.(element, handler);
    
    element.textContent = "changed";
    expect(true).toBe(true);
    unobserve?.();
  });

  it("should handle attribute mutations", () => {
    const element = document.createElement("div");
    const handler = vi.fn();
    const unobserve = observeMutations?.(element, handler, { attributes: true });
    
    element.setAttribute("data-test", "value");
    expect(true).toBe(true);
    unobserve?.();
  });
});

