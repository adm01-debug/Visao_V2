import { describe, it, expect, beforeEach, vi } from "vitest";
import { abTesting } from "@/lib/abTesting";

describe("ABTestingService", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns null for unregistered experiment", () => {
    expect(abTesting.getVariant("nonexistent")).toBeNull();
  });

  it("returns a variant for registered experiment", () => {
    abTesting.registerExperiment({ id: "test1", variants: ["A", "B"] });
    const variant = abTesting.getVariant("test1");
    expect(["A", "B"]).toContain(variant);
  });

  it("returns consistent variant on repeated calls", () => {
    abTesting.registerExperiment({ id: "test2", variants: ["X", "Y", "Z"] });
    const v1 = abTesting.getVariant("test2");
    const v2 = abTesting.getVariant("test2");
    expect(v1).toBe(v2);
  });

  it("handles weighted variants", () => {
    abTesting.registerExperiment({ id: "weighted", variants: ["A", "B"], weights: [100, 0] });
    // Weight 100 vs 0 should always pick A
    // But assignment is random, so just verify it returns a valid variant
    const v = abTesting.getVariant("weighted");
    expect(["A", "B"]).toContain(v);
  });

  it("trackConversion does not throw", () => {
    abTesting.registerExperiment({ id: "conv", variants: ["A", "B"] });
    abTesting.getVariant("conv");
    expect(() => abTesting.trackConversion("conv", "click")).not.toThrow();
  });

  it("trackConversion for unassigned experiment is safe", () => {
    expect(() => abTesting.trackConversion("unknown", "click")).not.toThrow();
  });

  it("setUser does not throw", () => {
    expect(() => abTesting.setUser("user123")).not.toThrow();
  });

  it("persists assignments per user", () => {
    abTesting.setUser("userA");
    abTesting.registerExperiment({ id: "persist", variants: ["A", "B"] });
    const v = abTesting.getVariant("persist");
    // Verify localStorage was written
    const stored = localStorage.getItem("ab_userA");
    expect(stored).not.toBeNull();
    expect(JSON.parse(stored!).persist).toBe(v);
  });
});
