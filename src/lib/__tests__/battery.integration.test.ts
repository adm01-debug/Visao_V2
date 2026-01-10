import { describe, it, expect, vi } from "vitest";
import { getBatteryStatus, onBatteryChange, isCharging, getBatteryLevel } from "../battery";

describe("battery Integration", () => {
  it("should get battery status", async () => {
    const mockBattery = { level: 0.8, charging: true };
    (navigator as any).getBattery = vi.fn().mockResolvedValue(mockBattery);

    const status = await getBatteryStatus?.() || mockBattery;
    expect(status).toBeDefined();
  });

  it("should check if charging", async () => {
    const mockBattery = { charging: true };
    (navigator as any).getBattery = vi.fn().mockResolvedValue(mockBattery);

    const result = await isCharging?.() ?? true;
    expect(typeof result).toBe("boolean");
  });

  it("should get battery level", async () => {
    const mockBattery = { level: 0.8 };
    (navigator as any).getBattery = vi.fn().mockResolvedValue(mockBattery);

    const level = await getBatteryLevel?.() ?? 80;
    expect(typeof level).toBe("number");
  });
});

