import { describe, it, expect } from "vitest";
import { isFullscreen, onChange } from "@/lib/fullscreen";

describe("fullscreen", () => {
  it("isFullscreen returns false by default", () => {
    expect(isFullscreen()).toBe(false);
  });

  it("onChange returns cleanup function", () => {
    const cleanup = onChange(() => {});
    expect(typeof cleanup).toBe("function");
    cleanup();
  });
});
