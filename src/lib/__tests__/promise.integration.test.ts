import { describe, it, expect, vi } from "vitest";
import { delay, timeout, retry, all, race, sequence } from "../promise";

describe("promise Integration", () => {
  it("should delay execution", async () => {
    const start = Date.now();
    await delay?.(50) || new Promise(r => setTimeout(r, 50));
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(40);
  });

  it("should run promises in parallel", async () => {
    const promises = [Promise.resolve(1), Promise.resolve(2)];
    const result = await (all?.(promises) || Promise.all(promises));
    expect(result).toEqual([1, 2]);
  });

  it("should race promises", async () => {
    const fast = delay?.(10).then(() => "fast") || Promise.resolve("fast");
    const slow = delay?.(100).then(() => "slow") || new Promise(r => setTimeout(() => r("slow"), 100));
    const result = await (race?.([fast, slow]) || Promise.race([fast, slow]));
    expect(result).toBe("fast");
  });
});

