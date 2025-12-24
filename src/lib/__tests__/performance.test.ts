import { describe, it, expect, vi } from "vitest";
import { measurePerformance, debounce, throttle, memoize } from "../performance";

describe("performance utils", () => {
  describe("measurePerformance", () => {
    it("measures execution time", () => {
      const perf = measurePerformance("test");
      const duration = perf.end();
      expect(duration).toBeGreaterThanOrEqual(0);
    });
  });

  describe("debounce", () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it("debounces function calls", () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);
      
      debounced();
      debounced();
      debounced();
      
      expect(fn).not.toHaveBeenCalled();
      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe("memoize", () => {
    it("caches results", () => {
      const fn = vi.fn((x: number) => x * 2);
      const memoized = memoize(fn);
      
      expect(memoized(5)).toBe(10);
      expect(memoized(5)).toBe(10);
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });
});
