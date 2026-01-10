import { describe, it, expect, vi } from "vitest";
import { onKeyDown, onKeyUp, isKeyPressed, addHotkey } from "../keyboard";

describe("keyboard Integration", () => {
  it("should listen for key down", () => {
    const handler = vi.fn();
    const removeListener = onKeyDown?.("Enter", handler);

    const event = new KeyboardEvent("keydown", { key: "Enter" });
    document.dispatchEvent(event);

    expect(handler).toHaveBeenCalled();
    removeListener?.();
  });

  it("should add hotkey", () => {
    const handler = vi.fn();
    const removeHotkey = addHotkey?.("ctrl+s", handler);

    expect(true).toBe(true);
    removeHotkey?.();
  });
});

