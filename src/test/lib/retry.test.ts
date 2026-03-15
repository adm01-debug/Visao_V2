import { describe, it, expect, vi } from "vitest";
import { retry, withRetry } from "@/lib/retry";

describe("lib/retry", () => {
  describe("retry", () => {
    it("succeeds on first try", async () => {
      const fn = vi.fn().mockResolvedValue("ok");
      const result = await retry(fn);
      expect(result).toBe("ok");
      expect(fn).toHaveBeenCalledTimes(1);
    });

    it("retries on failure then succeeds", async () => {
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error("fail1"))
        .mockRejectedValueOnce(new Error("fail2"))
        .mockResolvedValue("ok");
      const result = await retry(fn, { retries: 3, delay: 1 });
      expect(result).toBe("ok");
      expect(fn).toHaveBeenCalledTimes(3);
    });

    it("throws after all retries exhausted", async () => {
      const fn = vi.fn().mockRejectedValue(new Error("always fails"));
      await expect(retry(fn, { retries: 2, delay: 1 })).rejects.toThrow("always fails");
      expect(fn).toHaveBeenCalledTimes(3); // initial + 2 retries
    });

    it("calls onRetry callback", async () => {
      const onRetry = vi.fn();
      const fn = vi.fn()
        .mockRejectedValueOnce(new Error("fail"))
        .mockResolvedValue("ok");
      await retry(fn, { retries: 2, delay: 1, onRetry });
      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(onRetry).toHaveBeenCalledWith(expect.any(Error), 1);
    });

    it("handles non-Error throws", async () => {
      const fn = vi.fn().mockRejectedValue("string error");
      await expect(retry(fn, { retries: 0, delay: 1 })).rejects.toThrow("string error");
    });
  });

  describe("withRetry", () => {
    it("delegates to retry", async () => {
      const fn = vi.fn().mockResolvedValue(42);
      expect(await withRetry(fn, 1, 1)).toBe(42);
    });
  });
});
