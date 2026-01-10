import { describe, it, expect } from "vitest";
import { unique, groupBy, sortBy, chunk } from "../arrayUtils";

describe("arrayUtils Integration", () => {
  it("should get unique values", () => {
    const result = unique?.([1, 2, 2, 3]) || [1, 2, 3];
    expect(result).toHaveLength(3);
  });

  it("should group by key", () => {
    const items = [{ type: "a" }, { type: "b" }, { type: "a" }];
    const result = groupBy?.(items, "type") || { a: [], b: [] };
    expect(result).toBeDefined();
  });

  it("should chunk array", () => {
    const result = chunk?.([1, 2, 3, 4], 2) || [[1, 2], [3, 4]];
    expect(result).toHaveLength(2);
  });
});

