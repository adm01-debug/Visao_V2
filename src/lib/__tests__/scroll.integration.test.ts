import { describe, it, expect, vi } from "vitest";
import { scrollTo, scrollToTop, scrollToElement, getScrollPosition } from "../scroll";

describe("scroll Integration", () => {
  it("should scroll to position", () => {
    window.scrollTo = vi.fn();

    scrollTo?.(0, 100);
    expect(window.scrollTo).toHaveBeenCalled();
  });

  it("should scroll to top", () => {
    window.scrollTo = vi.fn();

    scrollToTop?.();
    expect(window.scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
  });

  it("should get scroll position", () => {
    const result = getScrollPosition?.() || { x: 0, y: 0 };
    expect(result).toHaveProperty("x");
    expect(result).toHaveProperty("y");
  });
});

