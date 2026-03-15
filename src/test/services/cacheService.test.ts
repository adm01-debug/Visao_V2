import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cacheService } from "@/services/cacheService";

describe("CacheService", () => {
  beforeEach(() => { cacheService.clear(); vi.useFakeTimers(); });
  afterEach(() => vi.useRealTimers());

  it("set/get stores and retrieves", () => {
    cacheService.set("key", "value");
    expect(cacheService.get("key")).toBe("value");
  });

  it("returns null for missing key", () => {
    expect(cacheService.get("nope")).toBeNull();
  });

  it("has() checks existence", () => {
    cacheService.set("k", 1);
    expect(cacheService.has("k")).toBe(true);
    expect(cacheService.has("missing")).toBe(false);
  });

  it("delete removes key", () => {
    cacheService.set("k", 1);
    cacheService.delete("k");
    expect(cacheService.get("k")).toBeNull();
  });

  it("clear removes all", () => {
    cacheService.set("a", 1);
    cacheService.set("b", 2);
    cacheService.clear();
    expect(cacheService.size()).toBe(0);
  });

  it("keys returns all keys", () => {
    cacheService.set("x", 1);
    cacheService.set("y", 2);
    expect(cacheService.keys().sort()).toEqual(["x", "y"]);
  });

  it("size returns count", () => {
    cacheService.set("a", 1);
    cacheService.set("b", 2);
    expect(cacheService.size()).toBe(2);
  });

  it("expires after TTL", () => {
    cacheService.set("temp", "val", 1000);
    expect(cacheService.get("temp")).toBe("val");
    vi.advanceTimersByTime(1001);
    expect(cacheService.get("temp")).toBeNull();
  });

  it("does not expire with ttl=0 (no expiry)", () => {
    cacheService.set("forever", "val", 0);
    vi.advanceTimersByTime(999999);
    expect(cacheService.get("forever")).toBe("val");
  });

  it("getOrSet caches result", async () => {
    const factory = vi.fn().mockResolvedValue("computed");
    const v1 = await cacheService.getOrSet("key", factory);
    const v2 = await cacheService.getOrSet("key", factory);
    expect(v1).toBe("computed");
    expect(v2).toBe("computed");
    expect(factory).toHaveBeenCalledTimes(1);
  });

  it("cleanup removes expired entries", () => {
    cacheService.set("a", 1, 100);
    cacheService.set("b", 2, 5000);
    vi.advanceTimersByTime(200);
    cacheService.cleanup();
    expect(cacheService.has("a")).toBe(false);
    expect(cacheService.has("b")).toBe(true);
  });

  it("stores complex objects", () => {
    const obj = { nested: { arr: [1, 2, 3] } };
    cacheService.set("complex", obj);
    expect(cacheService.get("complex")).toEqual(obj);
  });
});
