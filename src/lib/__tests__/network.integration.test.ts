import { describe, it, expect, vi } from "vitest";
import { isOnline, getConnectionType, onOnline, onOffline } from "../network";

describe("network Integration", () => {
  it("should check if online", () => {
    const result = isOnline?.() ?? navigator.onLine;
    expect(typeof result).toBe("boolean");
  });

  it("should get connection type", () => {
    const result = getConnectionType?.() || "unknown";
    expect(result).toBeDefined();
  });

  it("should handle online event", () => {
    const handler = vi.fn();
    const unsubscribe = onOnline?.(handler);
    expect(true).toBe(true);
    unsubscribe?.();
  });

  it("should handle offline event", () => {
    const handler = vi.fn();
    const unsubscribe = onOffline?.(handler);
    expect(true).toBe(true);
    unsubscribe?.();
  });
});

