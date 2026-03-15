import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { scheduler } from "@/utils/scheduler";

describe("Scheduler", () => {
  beforeEach(() => { vi.useFakeTimers(); scheduler.cancelAll(); });
  afterEach(() => vi.useRealTimers());

  describe("interval tasks", () => {
    it("runs at interval", () => {
      const fn = vi.fn();
      scheduler.schedule({ id: "t1", fn, interval: 1000 });
      vi.advanceTimersByTime(3000);
      expect(fn).toHaveBeenCalledTimes(3);
    });
    it("cancel stops interval", () => {
      const fn = vi.fn();
      scheduler.schedule({ id: "t2", fn, interval: 500 });
      vi.advanceTimersByTime(1000);
      scheduler.cancel("t2");
      vi.advanceTimersByTime(2000);
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe("scheduled (runAt) tasks", () => {
    it("runs at specified time", () => {
      const fn = vi.fn();
      scheduler.schedule({ id: "t3", fn, runAt: new Date(Date.now() + 2000) });
      vi.advanceTimersByTime(1999);
      expect(fn).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1);
      expect(fn).toHaveBeenCalledTimes(1);
    });
    it("ignores past dates", () => {
      const fn = vi.fn();
      scheduler.schedule({ id: "t4", fn, runAt: new Date(Date.now() - 1000) });
      vi.advanceTimersByTime(5000);
      expect(fn).not.toHaveBeenCalled();
    });
  });

  describe("cancel", () => {
    it("returns true for existing", () => {
      scheduler.schedule({ id: "t5", fn: vi.fn(), interval: 1000 });
      expect(scheduler.cancel("t5")).toBe(true);
    });
    it("returns false for non-existing", () => {
      expect(scheduler.cancel("nope")).toBe(false);
    });
  });

  describe("cancelAll", () => {
    it("stops all tasks", () => {
      const fn1 = vi.fn(); const fn2 = vi.fn();
      scheduler.schedule({ id: "a", fn: fn1, interval: 100 });
      scheduler.schedule({ id: "b", fn: fn2, interval: 100 });
      scheduler.cancelAll();
      vi.advanceTimersByTime(1000);
      expect(fn1).not.toHaveBeenCalled();
      expect(fn2).not.toHaveBeenCalled();
    });
  });
});
