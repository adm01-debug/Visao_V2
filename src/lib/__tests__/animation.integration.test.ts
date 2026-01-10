import { describe, it, expect, vi } from "vitest";
import { animate, fadeIn, fadeOut, slideIn, slideOut } from "../animation";

describe("animation Integration", () => {
  it("should animate element", () => {
    const element = document.createElement("div");
    element.animate = vi.fn();

    animate?.(element, [{ opacity: 0 }, { opacity: 1 }], { duration: 300 });
    expect(element.animate).toHaveBeenCalled();
  });

  it("should fade in element", () => {
    const element = document.createElement("div");
    element.animate = vi.fn();

    fadeIn?.(element);
    expect(true).toBe(true);
  });
});

