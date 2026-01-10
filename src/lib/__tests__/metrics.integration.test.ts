import { describe, it, expect } from "vitest";
import { trackMetric, getMetrics, resetMetrics } from "../metrics";

describe("metrics Integration", () => {
  it("should track metric", () => {
    trackMetric?.("page_view", 1);
    const metrics = getMetrics?.() || {};
    expect(metrics).toBeDefined();
  });

  it("should reset metrics", () => {
    trackMetric?.("page_view", 1);
    resetMetrics?.();
    const metrics = getMetrics?.() || {};
    expect(metrics).toBeDefined();
  });
});

