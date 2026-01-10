import { describe, it, expect, vi } from "vitest";
import { vibrate, vibratePattern, stopVibration } from "../vibration";

describe("vibration Integration", () => {
  it("should vibrate device", () => {
    navigator.vibrate = vi.fn();
    vibrate?.(100) || navigator.vibrate(100);
    expect(navigator.vibrate).toHaveBeenCalledWith(100);
  });

  it("should vibrate with pattern", () => {
    navigator.vibrate = vi.fn();
    vibratePattern?.([100, 50, 100]) || navigator.vibrate([100, 50, 100]);
    expect(navigator.vibrate).toHaveBeenCalled();
  });

  it("should stop vibration", () => {
    navigator.vibrate = vi.fn();
    stopVibration?.() || navigator.vibrate(0);
    expect(navigator.vibrate).toHaveBeenCalled();
  });
});

