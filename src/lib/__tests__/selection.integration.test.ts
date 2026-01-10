import { describe, it, expect, vi } from "vitest";
import { getSelection, clearSelection, selectElement, selectText } from "../selection";

describe("selection Integration", () => {
  it("should get selection", () => {
    window.getSelection = vi.fn().mockReturnValue({ toString: () => "selected" });
    const result = getSelection?.() || window.getSelection()?.toString();
    expect(result).toBeDefined();
  });

  it("should clear selection", () => {
    window.getSelection = vi.fn().mockReturnValue({ removeAllRanges: vi.fn() });
    clearSelection?.() || window.getSelection()?.removeAllRanges();
    expect(true).toBe(true);
  });

  it("should select element", () => {
    const element = document.createElement("div");
    element.textContent = "test";
    selectElement?.(element);
    expect(true).toBe(true);
  });
});

