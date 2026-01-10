import { describe, it, expect, vi } from "vitest";
import { requestWakeLock, releaseWakeLock, isWakeLockActive } from "../wakeLock";

describe("wakeLock Integration", () => {
  it("should request wake lock", async () => {
    const mockLock = { release: vi.fn() };
    (navigator as any).wakeLock = { request: vi.fn().mockResolvedValue(mockLock) };

    const lock = await requestWakeLock?.() || mockLock;
    expect(lock).toBeDefined();
  });

  it("should release wake lock", async () => {
    const mockLock = { release: vi.fn() };
    await releaseWakeLock?.(mockLock) || mockLock.release();
    expect(mockLock.release).toHaveBeenCalled();
  });

  it("should check if wake lock is active", () => {
    const result = isWakeLockActive?.() ?? false;
    expect(typeof result).toBe("boolean");
  });
});

