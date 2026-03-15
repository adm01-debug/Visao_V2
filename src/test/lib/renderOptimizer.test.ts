import { describe, it, expect } from "vitest";
import { measureRender } from "@/lib/renderOptimizer";

describe("renderOptimizer", () => {
  it("measureRender returns duration >= 0", () => {
    const duration = measureRender("test", () => {
      for (let i = 0; i < 1000; i++) {}
    });
    expect(duration).toBeGreaterThanOrEqual(0);
  });

  it("measureRender executes callback", () => {
    let called = false;
    measureRender("exec", () => { called = true; });
    expect(called).toBe(true);
  });
});
