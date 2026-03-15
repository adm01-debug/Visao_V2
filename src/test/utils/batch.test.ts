import { describe, it, expect, vi } from "vitest";
import { processBatch } from "@/utils/batch";

describe("processBatch", () => {
  it("processes all items", async () => {
    const items = [1, 2, 3, 4, 5];
    const results = await processBatch(items, async (n) => n * 2);
    expect(results).toEqual([2, 4, 6, 8, 10]);
  });

  it("handles empty array", async () => {
    expect(await processBatch([], async (n) => n)).toEqual([]);
  });

  it("respects batchSize", async () => {
    const items = Array.from({ length: 20 }, (_, i) => i);
    const results = await processBatch(items, async (n) => n, { batchSize: 5 });
    expect(results).toHaveLength(20);
    expect(results).toEqual(items);
  });

  it("calls onProgress", async () => {
    const onProgress = vi.fn();
    const items = Array.from({ length: 10 }, (_, i) => i);
    await processBatch(items, async (n) => n, { batchSize: 5, concurrency: 1, onProgress });
    expect(onProgress).toHaveBeenCalled();
    const lastCall = onProgress.mock.calls[onProgress.mock.calls.length - 1];
    expect(lastCall[0]).toBe(10);
    expect(lastCall[1]).toBe(10);
  });

  it("handles errors in processor", async () => {
    const items = [1, 2, 3];
    await expect(
      processBatch(items, async (n) => { if (n === 2) throw new Error("fail"); return n; })
    ).rejects.toThrow("fail");
  });

  it("processes large batch", async () => {
    const items = Array.from({ length: 100 }, (_, i) => i);
    const results = await processBatch(items, async (n) => n + 1, { batchSize: 10, concurrency: 5 });
    expect(results).toHaveLength(100);
    expect(results[0]).toBe(1);
    expect(results[99]).toBe(100);
  });
});
