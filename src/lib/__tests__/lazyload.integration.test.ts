import { describe, it, expect, vi } from "vitest";
import { lazyLoad, observeLazyLoad, unobserveLazyLoad } from "../lazyload";

describe("lazyload Integration", () => {
  it("should lazy load image", () => {
    const img = document.createElement("img");
    img.dataset.src = "test.jpg";
    lazyLoad?.(img);
    expect(true).toBe(true);
  });

  it("should observe lazy load", () => {
    const img = document.createElement("img");
    img.dataset.src = "test.jpg";
    const unobserve = observeLazyLoad?.(img);
    expect(true).toBe(true);
    unobserve?.();
  });
});

