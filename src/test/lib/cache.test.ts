import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { memoryCache } from "@/lib/cache";

describe("lib/cache (MemoryCache)", () => {
  beforeEach(() => { memoryCache.clear(); vi.useFakeTimers(); });
  afterEach(() => vi.useRealTimers());

  it("set/get stores value", () => {
    memoryCache.set("key", "value");
    expect(memoryCache.get("key")).toBe("value");
  });

  it("returns null for missing", () => {
    expect(memoryCache.get("nope")).toBeNull();
  });

  it("expires after TTL", () => {
    memoryCache.set("temp", "val", 1000);
    expect(memoryCache.get("temp")).toBe("val");
    vi.advanceTimersByTime(1001);
    expect(memoryCache.get("temp")).toBeNull();
  });

  it("delete removes entry", () => {
    memoryCache.set("k", 1);
    expect(memoryCache.delete("k")).toBe(true);
    expect(memoryCache.get("k")).toBeNull();
  });

  it("has checks existence (respects TTL)", () => {
    memoryCache.set("k", 1, 100);
    expect(memoryCache.has("k")).toBe(true);
    vi.advanceTimersByTime(101);
    expect(memoryCache.has("k")).toBe(false);
  });

  it("size returns count", () => {
    memoryCache.set("a", 1);
    memoryCache.set("b", 2);
    expect(memoryCache.size()).toBe(2);
  });

  it("clear removes all", () => {
    memoryCache.set("a", 1);
    memoryCache.set("b", 2);
    memoryCache.clear();
    expect(memoryCache.size()).toBe(0);
  });

  it("stores complex objects", () => {
    memoryCache.set("obj", { nested: [1, 2] });
    expect(memoryCache.get("obj")).toEqual({ nested: [1, 2] });
  });
});
