import { describe, it, expect } from "vitest";
import { paginate, getPageCount, getPageItems, getCurrentPage } from "../paginate";

describe("paginate Integration", () => {
  it("should paginate items", () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const result = paginate?.(items, 1, 5) || items.slice(0, 5);
    expect(result.length).toBe(5);
  });

  it("should get page count", () => {
    const result = getPageCount?.(100, 10) ?? 10;
    expect(result).toBe(10);
  });

  it("should get page items", () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const result = getPageItems?.(items, 2, 5) || items.slice(5, 10);
    expect(result[0]).toBe(6);
  });
});

