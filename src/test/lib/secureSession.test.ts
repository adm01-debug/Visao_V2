import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SecureSession, secureSession } from "@/lib/secureSession";

describe("SecureSession", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("initially has no token", () => {
    const s = new SecureSession();
    expect(s.getToken()).toBeNull();
    expect(s.isValid()).toBe(false);
  });

  it("setToken stores token", () => {
    const s = new SecureSession();
    s.setToken("abc123", 3600);
    expect(s.getToken()).toBe("abc123");
    expect(s.isValid()).toBe(true);
  });

  it("token expires after expiresIn seconds", () => {
    const s = new SecureSession();
    s.setToken("token", 10); // 10 seconds
    vi.advanceTimersByTime(11000);
    expect(s.getToken()).toBeNull();
    expect(s.isValid()).toBe(false);
  });

  it("token valid before expiry", () => {
    const s = new SecureSession();
    s.setToken("token", 60);
    vi.advanceTimersByTime(30000);
    expect(s.isValid()).toBe(true);
    expect(s.getToken()).toBe("token");
  });

  it("clear removes token", () => {
    const s = new SecureSession();
    s.setToken("token", 3600);
    s.clear();
    expect(s.getToken()).toBeNull();
    expect(s.isValid()).toBe(false);
  });

  it("refresh replaces token", () => {
    const s = new SecureSession();
    s.setToken("old", 10);
    s.refresh("new", 3600);
    expect(s.getToken()).toBe("new");
  });

  it("singleton instance works", () => {
    secureSession.setToken("singleton", 100);
    expect(secureSession.getToken()).toBe("singleton");
    secureSession.clear();
  });

  // SECURITY GAP: token stored in plain memory, no encryption
  it("SECURITY GAP: token stored in plain text in memory", () => {
    const s = new SecureSession();
    s.setToken("sensitive-jwt-token", 3600);
    // Token is accessible directly — no memory protection
    expect(s.getToken()).toBe("sensitive-jwt-token");
  });
});
