import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { RateLimiter } from "@/lib/rateLimiter";

describe("RateLimiter", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("allows requests within limit", () => {
    const rl = new RateLimiter(3, 1000);
    expect(rl.canMakeRequest()).toBe(true);
    expect(rl.canMakeRequest()).toBe(true);
    expect(rl.canMakeRequest()).toBe(true);
  });

  it("blocks requests over limit", () => {
    const rl = new RateLimiter(2, 1000);
    rl.canMakeRequest();
    rl.canMakeRequest();
    expect(rl.canMakeRequest()).toBe(false);
  });

  it("resets after window expires", () => {
    const rl = new RateLimiter(1, 500);
    rl.canMakeRequest();
    expect(rl.canMakeRequest()).toBe(false);
    vi.advanceTimersByTime(501);
    expect(rl.canMakeRequest()).toBe(true);
  });

  it("getTimeUntilNext returns 0 when available", () => {
    const rl = new RateLimiter(5, 1000);
    expect(rl.getTimeUntilNext()).toBe(0);
  });

  it("getTimeUntilNext returns positive when exhausted", () => {
    const rl = new RateLimiter(1, 1000);
    rl.canMakeRequest();
    const wait = rl.getTimeUntilNext();
    expect(wait).toBeGreaterThan(0);
    expect(wait).toBeLessThanOrEqual(1000);
  });

  it("sliding window: partial expiry frees slots", () => {
    const rl = new RateLimiter(2, 1000);
    rl.canMakeRequest(); // t=0
    vi.advanceTimersByTime(600);
    rl.canMakeRequest(); // t=600
    expect(rl.canMakeRequest()).toBe(false); // full
    vi.advanceTimersByTime(401); // t=1001, first request expired
    expect(rl.canMakeRequest()).toBe(true);
  });
});
