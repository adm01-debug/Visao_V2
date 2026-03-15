import { describe, it, expect, vi } from "vitest";
import { isOnline, onOnline, onOffline, getConnectionInfo } from "@/lib/network";

describe("network", () => {
  it("isOnline returns boolean", () => {
    expect(typeof isOnline()).toBe("boolean");
  });

  it("onOnline registers and returns cleanup", () => {
    const cb = vi.fn();
    const cleanup = onOnline(cb);
    expect(typeof cleanup).toBe("function");
    cleanup();
  });

  it("onOffline registers and returns cleanup", () => {
    const cb = vi.fn();
    const cleanup = onOffline(cb);
    expect(typeof cleanup).toBe("function");
    cleanup();
  });

  it("onOnline fires on 'online' event", () => {
    const cb = vi.fn();
    onOnline(cb);
    window.dispatchEvent(new Event("online"));
    expect(cb).toHaveBeenCalled();
  });

  it("onOffline fires on 'offline' event", () => {
    const cb = vi.fn();
    onOffline(cb);
    window.dispatchEvent(new Event("offline"));
    expect(cb).toHaveBeenCalled();
  });

  it("cleanup stops listening", () => {
    const cb = vi.fn();
    const cleanup = onOnline(cb);
    cleanup();
    window.dispatchEvent(new Event("online"));
    expect(cb).not.toHaveBeenCalled();
  });

  it("getConnectionInfo returns null when no connection API", async () => {
    const info = await getConnectionInfo();
    expect(info).toBeNull();
  });
});
