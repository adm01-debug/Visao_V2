import { describe, it, expect } from "vitest";
import { analyzeDependencies, suggestSplitPoints, getLoadedChunks } from "@/lib/bundleOptimizer";

describe("bundleOptimizer", () => {
  it("analyzeDependencies returns array with sizes", () => {
    const deps = analyzeDependencies();
    expect(deps.length).toBeGreaterThan(0);
    deps.forEach(d => {
      expect(d.name).toBeDefined();
      expect(d.size).toBeGreaterThan(0);
    });
  });

  it("suggestSplitPoints filters by size > 50KB", () => {
    const deps = [
      { name: "small", size: 10000 },
      { name: "big", size: 100000 },
      { name: "medium", size: 50001 },
    ];
    const splits = suggestSplitPoints(deps);
    expect(splits).toContain("big");
    expect(splits).toContain("medium");
    expect(splits).not.toContain("small");
  });

  it("suggestSplitPoints with empty input", () => {
    expect(suggestSplitPoints([])).toEqual([]);
  });

  it("getLoadedChunks returns array", () => {
    expect(Array.isArray(getLoadedChunks())).toBe(true);
  });
});
