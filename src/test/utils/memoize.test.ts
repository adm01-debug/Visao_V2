import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { memoize } from "@/utils/memoize";

describe("memoize", () => {
  it("caches results", () => {
    const fn = vi.fn((x: number) => x * 2);
    const memoized = memoize(fn);
    expect(memoized(5)).toBe(10);
    expect(memoized(5)).toBe(10);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("different args = different cache entries", () => {
    const fn = vi.fn((x: number) => x * 2);
    const memoized = memoize(fn);
    expect(memoized(1)).toBe(2);
    expect(memoized(2)).toBe(4);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("respects maxSize (LRU eviction)", () => {
    const fn = vi.fn((x: number) => x);
    const memoized = memoize(fn, { maxSize: 2 });
    memoized(1);
    memoized(2);
    memoized(3); // evicts 1
    expect(memoized.has(1)).toBe(false);
    expect(memoized.has(2)).toBe(true);
    expect(memoized.has(3)).toBe(true);
  });

  it("respects TTL", () => {
    vi.useFakeTimers();
    const fn = vi.fn((x: number) => x);
    const memoized = memoize(fn, { ttl: 100 });
    memoized(1);
    expect(fn).toHaveBeenCalledTimes(1);

    vi.advanceTimersByTime(101);
    memoized(1); // cache expired
    expect(fn).toHaveBeenCalledTimes(2);
    vi.useRealTimers();
  });

  it("clear() empties cache", () => {
    const memoized = memoize((x: number) => x);
    memoized(1);
    memoized(2);
    expect(memoized.size()).toBe(2);
    memoized.clear();
    expect(memoized.size()).toBe(0);
  });

  it("delete() removes specific entry", () => {
    const memoized = memoize((x: number) => x);
    memoized(1);
    memoized(2);
    memoized.delete(1);
    expect(memoized.has(1)).toBe(false);
    expect(memoized.has(2)).toBe(true);
  });

  it("size() returns cache count", () => {
    const memoized = memoize((x: number) => x);
    expect(memoized.size()).toBe(0);
    memoized(1);
    memoized(2);
    expect(memoized.size()).toBe(2);
  });
});
