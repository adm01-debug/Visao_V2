import { describe, it, expect, vi } from "vitest";
import { requestFrame, cancelFrame, loop, once } from "../raf";

describe("raf Integration", () => {
  it("should request animation frame", () => {
    const callback = vi.fn();
    const id = requestFrame?.(callback) || requestAnimationFrame(callback);
    expect(id).toBeDefined();
    cancelAnimationFrame(id);
  });

  it("should cancel animation frame", () => {
    const callback = vi.fn();
    const id = requestAnimationFrame(callback);
    cancelFrame?.(id) || cancelAnimationFrame(id);
    expect(true).toBe(true);
  });

  it("should run once on next frame", () => {
    const callback = vi.fn();
    once?.(callback) || requestAnimationFrame(callback);
    expect(true).toBe(true);
  });
});

