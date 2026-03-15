import { describe, it, expect, vi } from "vitest";
import { vibrate } from "@/lib/notificationUtils";

describe("notificationUtils", () => {
  describe("vibrate", () => {
    it("calls navigator.vibrate when available", () => {
      const vibrateFn = vi.fn();
      Object.defineProperty(navigator, "vibrate", { value: vibrateFn, writable: true, configurable: true });
      vibrate(200);
      expect(vibrateFn).toHaveBeenCalledWith(200);
    });

    it("accepts array pattern", () => {
      const vibrateFn = vi.fn();
      Object.defineProperty(navigator, "vibrate", { value: vibrateFn, writable: true, configurable: true });
      vibrate([100, 50, 100]);
      expect(vibrateFn).toHaveBeenCalledWith([100, 50, 100]);
    });

    it("does not throw when vibrate is unavailable", () => {
      // Delete the property entirely so 'vibrate' in navigator is false
      const desc = Object.getOwnPropertyDescriptor(navigator, "vibrate");
      delete (navigator as any).vibrate;
      expect(() => vibrate()).not.toThrow();
      // Restore
      if (desc) Object.defineProperty(navigator, "vibrate", desc);
    });
  });
});
