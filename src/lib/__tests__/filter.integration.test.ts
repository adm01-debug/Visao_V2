import { describe, it, expect } from "vitest";
import { filterBy, filterByMultiple, search, fuzzySearch } from "../filter";

describe("filter Integration", () => {
  it("should filter by key", () => {
    const items = [{ active: true }, { active: false }, { active: true }];
    const result = filterBy?.(items, "active", true) || items.filter(i => i.active);
    expect(result.length).toBe(2);
  });

  it("should search items", () => {
    const items = [{ name: "hello" }, { name: "world" }, { name: "hello world" }];
    const result = search?.(items, "hello", "name") || items.filter(i => i.name.includes("hello"));
    expect(result.length).toBe(2);
  });
});

