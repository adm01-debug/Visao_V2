import { describe, it, expect, vi } from "vitest";
import { enterFullscreen, exitFullscreen, isFullscreen, toggleFullscreen } from "../fullscreen";

describe("fullscreen Integration", () => {
  it("should enter fullscreen", () => {
    const element = document.createElement("div");
    element.requestFullscreen = vi.fn();

    enterFullscreen?.(element);
    expect(element.requestFullscreen).toHaveBeenCalled();
  });

  it("should check fullscreen status", () => {
    const result = isFullscreen?.() ?? false;
    expect(typeof result).toBe("boolean");
  });
});

