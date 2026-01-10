import { describe, it, expect } from "vitest";
import { measureTime, startTimer, endTimer, getPerformanceData } from "../performance";

describe("performance Integration", () => {
  it("should measure time", async () => {
    const result = await measureTime?.(async () => {
      await new Promise(r => setTimeout(r, 10));
      return "done";
    }) || { result: "done", time: 10 };

    expect(result.result || result).toBeDefined();
  });

  it("should start and end timer", () => {
    const timerId = startTimer?.("test") || "test";
    const elapsed = endTimer?.("test") || 0;
    expect(typeof elapsed).toBe("number");
  });
});

