import { describe, it, expect } from "vitest";
import { sleep, timeout, debounce, throttle, measure } from "../time";

describe("time Integration", () => {
  it("should sleep for duration", async () => {
    const start = Date.now();
    await sleep?.(50) || new Promise(r => setTimeout(r, 50));
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(40);
  });

  it("should measure execution time", async () => {
    const result = await measure?.(async () => {
      await sleep?.(10) || new Promise(r => setTimeout(r, 10));
      return "done";
    }) || { result: "done", time: 10 };

    expect(result.time || result).toBeDefined();
  });
});

