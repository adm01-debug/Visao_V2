import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { sleep, timeout, retry, sequential, parallel, deferred, isPromise, sleepUntil } from "@/utils/promise";

describe("promise utils", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  describe("sleep", () => {
    it("resolves after delay", async () => {
      const p = sleep(100);
      vi.advanceTimersByTime(100);
      await expect(p).resolves.toBeUndefined();
    });
  });

  describe("timeout", () => {
    it("resolves if promise completes in time", async () => {
      vi.useRealTimers();
      const result = await timeout(Promise.resolve("ok"), 1000);
      expect(result).toBe("ok");
    });

    it("rejects on timeout", async () => {
      const slow = new Promise(() => {}); // never resolves
      const p = timeout(slow, 100, "Timed out!");
      vi.advanceTimersByTime(100);
      await expect(p).rejects.toThrow("Timed out!");
    });
  });

  describe("retry", () => {
    it("succeeds on first try", async () => {
      vi.useRealTimers();
      const fn = vi.fn().mockResolvedValue("ok");
      expect(await retry(fn, 3, 1)).toBe("ok");
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("retries and succeeds", async () => {
      vi.useRealTimers();
      const fn = vi.fn().mockRejectedValueOnce(new Error("1")).mockResolvedValue("ok");
      expect(await retry(fn, 3, 1, 1)).toBe("ok");
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it("throws after exhausting retries", async () => {
      vi.useRealTimers();
      const fn = vi.fn().mockRejectedValue(new Error("fail"));
      await expect(retry(fn, 2, 1, 1)).rejects.toThrow("fail");
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe("sequential", () => {
    it("executes in order", async () => {
      vi.useRealTimers();
      const order: number[] = [];
      const fns = [1, 2, 3].map(n => async () => { order.push(n); return n; });
      const results = await sequential(fns);
      expect(results).toEqual([1, 2, 3]);
      expect(order).toEqual([1, 2, 3]);
    });

    it("handles empty array", async () => {
      vi.useRealTimers();
      expect(await sequential([])).toEqual([]);
    });
  });

  describe("parallel", () => {
    it("executes all in parallel (unlimited)", async () => {
      vi.useRealTimers();
      const fns = [1, 2, 3].map(n => async () => n);
      expect(await parallel(fns)).toEqual([1, 2, 3]);
    });
  });

  describe("deferred", () => {
    it("resolves manually", async () => {
      vi.useRealTimers();
      const d = deferred<number>();
      setTimeout(() => d.resolve(42), 0);
      expect(await d.promise).toBe(42);
    });

    it("rejects manually", async () => {
      vi.useRealTimers();
      const d = deferred<number>();
      setTimeout(() => d.reject(new Error("nope")), 0);
      await expect(d.promise).rejects.toThrow("nope");
    });
  });

  describe("isPromise", () => {
    it("identifies promises", () => {
      expect(isPromise(Promise.resolve())).toBe(true);
      expect(isPromise(new Promise(() => {}))).toBe(true);
    });
    it("rejects non-promises", () => {
      expect(isPromise(42)).toBe(false);
      expect(isPromise("str")).toBe(false);
      expect(isPromise(null)).toBe(false);
      expect(isPromise(undefined)).toBe(false);
      expect(isPromise({})).toBe(false);
    });
    it("identifies thenable objects", () => {
      expect(isPromise({ then: () => {} })).toBe(true);
    });
  });
});
