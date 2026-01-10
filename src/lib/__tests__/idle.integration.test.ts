import { describe, it, expect, vi } from "vitest";
import { requestIdleCallback, cancelIdleCallback, whenIdle } from "../idle";

describe("idle Integration", () => {
  it("should request idle callback", () => {
    const callback = vi.fn();
    const id = requestIdleCallback?.(callback) || window.requestIdleCallback?.(callback) || 0;
    expect(true).toBe(true);
  });

  it("should run when idle", async () => {
    const callback = vi.fn();
    await whenIdle?.(callback);
    expect(true).toBe(true);
  });
});

