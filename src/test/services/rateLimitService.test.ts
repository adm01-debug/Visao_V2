import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { rateLimitService } from "@/services/rateLimitService";

describe("RateLimitService", () => {
  beforeEach(() => { rateLimitService.reset(); vi.useFakeTimers(); });
  afterEach(() => vi.useRealTimers());

  it("allows requests under limit", () => {
    rateLimitService.configure({ maxRequests: 5, windowMs: 1000 });
    for (let i = 0; i < 5; i++) {
      expect(rateLimitService.canMakeRequest("test")).toBe(true);
      rateLimitService.recordRequest("test");
    }
  });

  it("blocks after limit", () => {
    rateLimitService.configure({ maxRequests: 2, windowMs: 1000 });
    rateLimitService.recordRequest("k");
    rateLimitService.recordRequest("k");
    expect(rateLimitService.canMakeRequest("k")).toBe(false);
  });

  it("resets after window", () => {
    rateLimitService.configure({ maxRequests: 1, windowMs: 100 });
    rateLimitService.recordRequest("k");
    expect(rateLimitService.canMakeRequest("k")).toBe(false);
    vi.advanceTimersByTime(101);
    expect(rateLimitService.canMakeRequest("k")).toBe(true);
  });

  it("getRemainingRequests", () => {
    rateLimitService.configure({ maxRequests: 5, windowMs: 1000 });
    rateLimitService.recordRequest("k");
    rateLimitService.recordRequest("k");
    expect(rateLimitService.getRemainingRequests("k")).toBe(3);
  });

  it("getResetTime", () => {
    rateLimitService.configure({ maxRequests: 5, windowMs: 1000 });
    rateLimitService.recordRequest("k");
    vi.advanceTimersByTime(300);
    const reset = rateLimitService.getResetTime("k");
    expect(reset).toBeGreaterThan(0);
    expect(reset).toBeLessThanOrEqual(1000);
  });

  it("reset clears specific key", () => {
    rateLimitService.recordRequest("a");
    rateLimitService.recordRequest("b");
    rateLimitService.reset("a");
    expect(rateLimitService.getRemainingRequests("a")).toBe(100);
  });

  it("reset without key clears all", () => {
    rateLimitService.recordRequest("a");
    rateLimitService.recordRequest("b");
    rateLimitService.reset();
    expect(rateLimitService.getRemainingRequests("a")).toBe(100);
    expect(rateLimitService.getRemainingRequests("b")).toBe(100);
  });

  it("different keys are independent", () => {
    rateLimitService.configure({ maxRequests: 1, windowMs: 1000 });
    rateLimitService.recordRequest("a");
    expect(rateLimitService.canMakeRequest("a")).toBe(false);
    expect(rateLimitService.canMakeRequest("b")).toBe(true);
  });
});
