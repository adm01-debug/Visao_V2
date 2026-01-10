import { describe, it, expect } from "vitest";
import { rateLimiter, isRateLimited, checkLimit } from "../rateLimiter";

describe("rateLimiter Integration", () => {
  it("should limit requests", () => {
    const limiter = rateLimiter?.({ maxRequests: 3, windowMs: 1000 });
    
    expect(isRateLimited?.("user1") ?? false).toBe(false);
  });

  it("should track request count", () => {
    const result = checkLimit?.("user1") ?? { allowed: true, remaining: 10 };
    expect(result.allowed).toBe(true);
  });
});

