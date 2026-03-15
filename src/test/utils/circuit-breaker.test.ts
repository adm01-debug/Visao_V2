import { describe, it, expect, vi } from "vitest";
import { CircuitBreaker } from "@/utils/circuit-breaker";

describe("CircuitBreaker", () => {
  it("starts in closed state", () => {
    const cb = new CircuitBreaker();
    expect(cb.getState()).toBe("closed");
  });

  it("passes through on success", async () => {
    const cb = new CircuitBreaker();
    const result = await cb.execute(() => Promise.resolve(42));
    expect(result).toBe(42);
    expect(cb.getState()).toBe("closed");
  });

  it("stays closed under threshold", async () => {
    const cb = new CircuitBreaker(3);
    for (let i = 0; i < 2; i++) {
      await cb.execute(() => Promise.reject(new Error("fail"))).catch(() => {});
    }
    expect(cb.getState()).toBe("closed");
  });

  it("opens after reaching threshold", async () => {
    const cb = new CircuitBreaker(3);
    for (let i = 0; i < 3; i++) {
      await cb.execute(() => Promise.reject(new Error("fail"))).catch(() => {});
    }
    expect(cb.getState()).toBe("open");
  });

  it("rejects immediately when open", async () => {
    const cb = new CircuitBreaker(1, 60000);
    await cb.execute(() => Promise.reject(new Error("fail"))).catch(() => {});
    expect(cb.getState()).toBe("open");
    await expect(cb.execute(() => Promise.resolve("ok"))).rejects.toThrow("Circuit is open");
  });

  it("transitions to half-open after timeout", async () => {
    vi.useFakeTimers();
    const cb = new CircuitBreaker(1, 100);
    await cb.execute(() => Promise.reject(new Error("fail"))).catch(() => {});
    expect(cb.getState()).toBe("open");
    vi.advanceTimersByTime(200);
    const result = await cb.execute(() => Promise.resolve("recovered"));
    expect(result).toBe("recovered");
    expect(cb.getState()).toBe("closed");
    vi.useRealTimers();
  });

  it("resets failures on success", async () => {
    const cb = new CircuitBreaker(5);
    await cb.execute(() => Promise.reject(new Error("fail"))).catch(() => {});
    await cb.execute(() => Promise.reject(new Error("fail"))).catch(() => {});
    await cb.execute(() => Promise.resolve("ok"));
    // After success, failures reset — need 5 more to open
    for (let i = 0; i < 4; i++) {
      await cb.execute(() => Promise.reject(new Error("fail"))).catch(() => {});
    }
    expect(cb.getState()).toBe("closed");
  });

  it("reset() restores to closed", async () => {
    const cb = new CircuitBreaker(1);
    await cb.execute(() => Promise.reject(new Error("fail"))).catch(() => {});
    expect(cb.getState()).toBe("open");
    cb.reset();
    expect(cb.getState()).toBe("closed");
    const result = await cb.execute(() => Promise.resolve("ok"));
    expect(result).toBe("ok");
  });

  it("propagates the original error", async () => {
    const cb = new CircuitBreaker(5);
    await expect(cb.execute(() => Promise.reject(new Error("specific error")))).rejects.toThrow("specific error");
  });
});
