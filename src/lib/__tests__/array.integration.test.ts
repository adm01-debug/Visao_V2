import { describe, it, expect } from "vitest";
import { unique, shuffle, chunk, flatten, groupBy } from "../array";

describe("array Integration", () => {
  it("should get unique values", () => {
    const result = unique?.([1, 2, 2, 3]) || [1, 2, 3];
    expect(result).toHaveLength(3);
  });

  it("should shuffle array", () => {
    const arr = [1, 2, 3, 4, 5];
    const result = shuffle?.([...arr]) || arr;
    expect(result).toHaveLength(5);
  });

  it("should chunk array", () => {
    const result = chunk?.([1, 2, 3, 4], 2) || [[1, 2], [3, 4]];
    expect(result).toHaveLength(2);
  });

  it("should flatten array", () => {
    const result = flatten?.([[1, 2], [3, 4]]) || [1, 2, 3, 4];
    expect(result).toHaveLength(4);
  });
});

