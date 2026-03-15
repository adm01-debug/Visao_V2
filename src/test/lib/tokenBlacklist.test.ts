import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import TokenBlacklist from "@/lib/tokenBlacklist";

describe("TokenBlacklist", () => {
  let bl: InstanceType<typeof TokenBlacklist>;

  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    bl = new TokenBlacklist();
  });

  afterEach(() => {
    bl.destroy();
    vi.useRealTimers();
  });

  it("starts empty", () => {
    expect(bl.getCount()).toBe(0);
  });

  it("add blacklists a token", () => {
    bl.add("token123", "logout");
    expect(bl.isBlacklisted("token123")).toBe(true);
    expect(bl.getCount()).toBe(1);
  });

  it("non-blacklisted token returns false", () => {
    expect(bl.isBlacklisted("unknown")).toBe(false);
  });

  it("remove un-blacklists a token", () => {
    bl.add("token1", "test");
    expect(bl.remove("token1")).toBe(true);
    expect(bl.isBlacklisted("token1")).toBe(false);
  });

  it("remove returns false for missing", () => {
    expect(bl.remove("nope")).toBe(false);
  });

  it("expired tokens are auto-removed on check", () => {
    bl.add("token1", "test", 1000);
    vi.advanceTimersByTime(1001);
    expect(bl.isBlacklisted("token1")).toBe(false);
  });

  it("cleanup removes expired entries", () => {
    bl.add("t1", "test", 500);
    bl.add("t2", "test", 5000);
    vi.advanceTimersByTime(501);
    bl.cleanup();
    expect(bl.getCount()).toBe(1);
  });

  it("clear removes all", () => {
    bl.add("t1", "a");
    bl.add("t2", "b");
    bl.clear();
    expect(bl.getCount()).toBe(0);
  });

  it("getReasons aggregates", () => {
    bl.add("t1", "logout");
    bl.add("t2", "logout");
    bl.add("t3", "security");
    const reasons = bl.getReasons();
    expect(reasons["logout"]).toBe(2);
    expect(reasons["security"]).toBe(1);
  });

  it("persists to localStorage", () => {
    bl.add("token1", "test");
    const stored = localStorage.getItem("visao_token_blacklist");
    expect(stored).not.toBeNull();
    expect(JSON.parse(stored!).length).toBe(1);
  });
});
