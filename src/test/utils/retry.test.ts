import { describe, it, expect, vi } from "vitest";
import { retry } from "@/utils/retry";

describe("utils/retry", () => {
  it("succeeds on first try", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    expect(await retry(fn)).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("retries on failure", async () => {
    const fn = vi.fn().mockRejectedValueOnce(new Error("fail")).mockResolvedValue("ok");
    expect(await retry(fn, { maxAttempts: 3, delay: 1 })).toBe("ok");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("throws after max attempts", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("always fails"));
    await expect(retry(fn, { maxAttempts: 2, delay: 1 })).rejects.toThrow("always fails");
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("calls onRetry callback", async () => {
    const onRetry = vi.fn();
    const fn = vi.fn().mockRejectedValueOnce(new Error("fail")).mockResolvedValue("ok");
    await retry(fn, { maxAttempts: 3, delay: 1, onRetry });
    expect(onRetry).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledWith(expect.any(Error), 1);
  });

  it("uses backoff", async () => {
    const fn = vi.fn().mockRejectedValueOnce(new Error("1")).mockRejectedValueOnce(new Error("2")).mockResolvedValue("ok");
    const start = Date.now();
    await retry(fn, { maxAttempts: 3, delay: 10, backoff: 1 });
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(15); // at least 2 delays
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("uses default options", async () => {
    const fn = vi.fn().mockResolvedValue(42);
    expect(await retry(fn)).toBe(42);
  });
});
