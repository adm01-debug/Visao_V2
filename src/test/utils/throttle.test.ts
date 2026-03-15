import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { throttle, debounce } from "@/utils/throttle";

describe("throttle & debounce", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  describe("throttle", () => {
    it("executes immediately (leading)", () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 100);
      throttled();
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("limits execution rate", () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 100);
      throttled(); // executes
      throttled(); // queued
      throttled(); // queued (replaces)
      expect(fn).toHaveBeenCalledTimes(1);
      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(2); // trailing
    });

    it("cancel() stops pending", () => {
      const fn = vi.fn();
      const throttled = throttle(fn, 100);
      throttled();
      throttled();
      throttled.cancel();
      vi.advanceTimersByTime(200);
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });

  describe("debounce", () => {
    it("delays execution", () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);
      debounced();
      expect(fn).not.toHaveBeenCalled();
      vi.advanceTimersByTime(100);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("resets timer on each call", () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);
      debounced();
      vi.advanceTimersByTime(50);
      debounced();
      vi.advanceTimersByTime(50);
      expect(fn).not.toHaveBeenCalled();
      vi.advanceTimersByTime(50);
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("leading mode executes immediately", () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100, { leading: true });
      debounced();
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("cancel() stops pending", () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);
      debounced();
      debounced.cancel();
      vi.advanceTimersByTime(200);
      expect(fn).not.toHaveBeenCalled();
    });

    it("flush() executes immediately", () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);
      debounced();
      debounced.flush();
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("pending() reports status", () => {
      const fn = vi.fn();
      const debounced = debounce(fn, 100);
      expect(debounced.pending()).toBe(false);
      debounced();
      expect(debounced.pending()).toBe(true);
      vi.advanceTimersByTime(100);
      expect(debounced.pending()).toBe(false);
    });
  });
});
