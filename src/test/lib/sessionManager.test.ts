import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import SessionManager from "@/lib/sessionManager";

describe("SessionManager", () => {
  let sm: InstanceType<typeof SessionManager>;

  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    vi.stubGlobal("crypto", {
      ...crypto,
      randomUUID: () => "test-uuid-" + Math.random().toString(36).slice(2),
      getRandomValues: (arr: Uint8Array) => { for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256); return arr; },
    });
    sm = new SessionManager({ storageKey: "test_session" });
  });

  afterEach(() => {
    sm.clear();
    vi.useRealTimers();
  });

  it("starts with no session", () => {
    expect(sm.get()).toBeNull();
    expect(sm.isValid()).toBe(false);
    expect(sm.getToken()).toBeNull();
  });

  it("create creates a session", async () => {
    const session = await sm.create("user1", "token123");
    expect(session.userId).toBe("user1");
    expect(session.token).toBe("token123");
    expect(sm.isValid()).toBe(true);
  });

  it("getToken returns token", async () => {
    await sm.create("u", "tok");
    expect(sm.getToken()).toBe("tok");
  });

  it("clear removes session", async () => {
    await sm.create("u", "tok");
    sm.clear();
    expect(sm.get()).toBeNull();
  });

  it("session expires after maxAge", async () => {
    const mgr = new SessionManager({ storageKey: "test2", maxAge: 1000 });
    await mgr.create("u", "tok");
    vi.advanceTimersByTime(1001);
    expect(mgr.isValid()).toBe(false);
    mgr.clear();
  });

  it("getTimeRemaining decreases", async () => {
    await sm.create("u", "tok");
    const t1 = sm.getTimeRemaining();
    vi.advanceTimersByTime(5000);
    const t2 = sm.getTimeRemaining();
    expect(t2).toBeLessThan(t1);
  });

  it("updateMetadata merges", async () => {
    await sm.create("u", "tok", undefined, { a: 1 });
    sm.updateMetadata({ b: 2 });
    expect(sm.get()!.metadata).toEqual({ a: 1, b: 2 });
  });

  it("isExpiringSoon", async () => {
    const mgr = new SessionManager({ storageKey: "test3", maxAge: 10000, refreshThreshold: 5000 });
    await mgr.create("u", "tok");
    expect(mgr.isExpiringSoon()).toBe(false);
    vi.advanceTimersByTime(6000);
    expect(mgr.isExpiringSoon()).toBe(true);
    mgr.clear();
  });
});
