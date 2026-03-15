import { describe, it, expect, vi, afterEach } from "vitest";
import { onKey, offKey, isPressed } from "@/lib/keyboard";

describe("keyboard", () => {
  it("onKey returns unsubscribe function", () => {
    const handler = vi.fn();
    const unsub = onKey("Enter", handler);
    expect(typeof unsub).toBe("function");
    unsub();
  });

  it("isPressed returns true for matching key", () => {
    const event = new KeyboardEvent("keydown", { key: "Escape" });
    expect(isPressed(event, "Escape")).toBe(true);
  });

  it("isPressed returns false for non-matching key", () => {
    const event = new KeyboardEvent("keydown", { key: "Enter" });
    expect(isPressed(event, "Escape")).toBe(false);
  });

  it("offKey removes handler safely", () => {
    const handler = vi.fn();
    onKey("a", handler);
    expect(() => offKey("a", handler)).not.toThrow();
  });

  it("offKey for non-registered key is safe", () => {
    expect(() => offKey("z", vi.fn())).not.toThrow();
  });
});
