import { describe, it, expect } from "vitest";
import { AnomalyDetector } from "@/lib/anomalyDetection";

describe("AnomalyDetector", () => {
  it("returns no anomaly without training", () => {
    const d = new AnomalyDetector();
    const r = d.detect(100);
    expect(r.isAnomaly).toBe(false);
    expect(r.score).toBe(0);
  });

  it("detects normal values", () => {
    const d = new AnomalyDetector();
    d.train([10, 12, 11, 10, 13, 11, 12]);
    const r = d.detect(11);
    expect(r.isAnomaly).toBe(false);
    expect(r.score).toBeLessThan(3);
  });

  it("detects anomalous values (high z-score)", () => {
    const d = new AnomalyDetector();
    d.train([10, 10, 10, 10, 10, 10, 10]);
    const r = d.detect(100);
    expect(r.isAnomaly).toBe(true);
    expect(r.score).toBeGreaterThan(3);
  });

  it("handles uniform data (std=0)", () => {
    const d = new AnomalyDetector();
    d.train([5, 5, 5, 5]);
    const r = d.detect(5);
    expect(r.isAnomaly).toBe(false);
    expect(r.score).toBe(0);
  });

  it("handles uniform data with different value", () => {
    const d = new AnomalyDetector();
    d.train([5, 5, 5, 5]);
    const r = d.detect(10);
    expect(r.isAnomaly).toBe(true);
  });

  it("handles negative values", () => {
    const d = new AnomalyDetector();
    d.train([-10, -12, -11, -10, -13]);
    const r = d.detect(-11);
    expect(r.isAnomaly).toBe(false);
  });

  it("borderline values near threshold", () => {
    const d = new AnomalyDetector();
    // Create data with known std dev
    d.train([0, 0, 0, 0, 10, 10, 10, 10]);
    const r = d.detect(5); // mean=5, should be near 0 z-score
    expect(r.score).toBeLessThan(1);
  });
});
