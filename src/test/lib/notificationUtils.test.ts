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
      Object.defineProperty(navigator, "vibrate", { value: undefined, writable: true, configurable: true });
      expect(() => vibrate()).not.toThrow();
    });
  });
});
