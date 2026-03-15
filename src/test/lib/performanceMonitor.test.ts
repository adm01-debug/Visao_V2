import { describe, it, expect, beforeEach } from "vitest";
import { performanceMonitor } from "@/lib/performanceMonitor";

describe("PerformanceMonitor", () => {
  beforeEach(() => performanceMonitor.clear());

  it("start and end measures duration", () => {
    performanceMonitor.start("op1");
    const d = performanceMonitor.end("op1");
    expect(d).toBeGreaterThanOrEqual(0);
  });

  it("end without start returns 0", () => {
    expect(performanceMonitor.end("unknown")).toBe(0);
  });

  it("measure syncs function and returns duration", () => {
    const d = performanceMonitor.measure("sync", () => {
      for (let i = 0; i < 1000; i++) {}
    });
    expect(d).toBeGreaterThanOrEqual(0);
  });

  it("measureAsync returns result", async () => {
    const result = await performanceMonitor.measureAsync("async", async () => 42);
    expect(result).toBe(42);
  });

  it("getAverage calculates correctly", () => {
    performanceMonitor.start("avg");
    performanceMonitor.end("avg");
    performanceMonitor.start("avg");
    performanceMonitor.end("avg");
    expect(performanceMonitor.getAverage("avg")).toBeGreaterThanOrEqual(0);
  });

  it("getAverage returns 0 for unknown", () => {
    expect(performanceMonitor.getAverage("nope")).toBe(0);
  });

  it("getMetrics returns stats", () => {
    performanceMonitor.start("stats");
    performanceMonitor.end("stats");
    const m = performanceMonitor.getMetrics("stats");
    expect(m).not.toBeNull();
    expect(m!.count).toBe(1);
    expect(m!.min).toBeGreaterThanOrEqual(0);
    expect(m!.max).toBeGreaterThanOrEqual(m!.min);
  });

  it("getMetrics returns null for unknown", () => {
    expect(performanceMonitor.getMetrics("nope")).toBeNull();
  });

  it("clear resets everything", () => {
    performanceMonitor.start("clear");
    performanceMonitor.end("clear");
    performanceMonitor.clear();
    expect(performanceMonitor.getMetrics("clear")).toBeNull();
  });

  it("reportWebVitals does not throw", () => {
    expect(() => performanceMonitor.reportWebVitals()).not.toThrow();
  });
});
