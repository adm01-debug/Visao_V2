import { describe, it, expect, beforeEach } from "vitest";
import { recordMetric, getMetrics, clearMetrics, getAverageMetric, startTimer } from "@/lib/metrics";

describe("metrics", () => {
  beforeEach(() => clearMetrics());

  it("recordMetric adds a metric", () => {
    recordMetric("api.latency", 150);
    expect(getMetrics("api.latency")).toHaveLength(1);
  });

  it("getMetrics returns all when no filter", () => {
    recordMetric("a", 1);
    recordMetric("b", 2);
    expect(getMetrics().length).toBe(2);
  });

  it("getMetrics filters by name", () => {
    recordMetric("x", 1);
    recordMetric("y", 2);
    recordMetric("x", 3);
    expect(getMetrics("x")).toHaveLength(2);
    expect(getMetrics("y")).toHaveLength(1);
  });

  it("clearMetrics empties all", () => {
    recordMetric("z", 100);
    clearMetrics();
    expect(getMetrics()).toHaveLength(0);
  });

  it("getAverageMetric calculates correctly", () => {
    recordMetric("avg", 10);
    recordMetric("avg", 20);
    recordMetric("avg", 30);
    expect(getAverageMetric("avg")).toBe(20);
  });

  it("getAverageMetric returns null for unknown", () => {
    expect(getAverageMetric("unknown")).toBeNull();
  });

  it("recordMetric with tags", () => {
    recordMetric("tagged", 5, { env: "prod" });
    const m = getMetrics("tagged")[0];
    expect(m.tags?.env).toBe("prod");
  });

  it("startTimer records duration", () => {
    const stop = startTimer("timer");
    // Do some work
    for (let i = 0; i < 1000; i++) {}
    stop();
    const m = getMetrics("timer");
    expect(m).toHaveLength(1);
    expect(m[0].value).toBeGreaterThanOrEqual(0);
  });

  it("metric has timestamp", () => {
    recordMetric("ts", 1);
    expect(getMetrics("ts")[0].timestamp).toBeGreaterThan(0);
  });
});
