import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useBattery } from "../useBattery";

interface MockBatteryManager {
  level: number;
  charging: boolean;
  chargingTime: number;
  dischargingTime: number;
  addEventListener: ReturnType<typeof vi.fn>;
  removeEventListener: ReturnType<typeof vi.fn>;
}

describe("useBattery", () => {
  let mockBattery: MockBatteryManager;

  beforeEach(() => {
    mockBattery = {
      level: 0.75,
      charging: true,
      chargingTime: 3600,
      dischargingTime: Infinity,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };

    Object.defineProperty(navigator, "getBattery", {
      value: vi.fn(() => Promise.resolve(mockBattery)),
      writable: true,
    });
  });

  it("should return battery status", async () => {
    const { result } = renderHook(() => useBattery());

    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
    });

    expect(result.current.level).toBe(0.75);
    expect(result.current.charging).toBe(true);
  });

  it("should handle unsupported browsers", async () => {
    Object.defineProperty(navigator, "getBattery", {
      value: undefined,
      writable: true,
    });

    const { result } = renderHook(() => useBattery());

    expect(result.current.supported).toBe(false);
  });
});

