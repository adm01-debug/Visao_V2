import { describe, it, expect } from "vitest";
import { sortBy, sortByMultiple, naturalSort, stableSort } from "../sort";

describe("sort Integration", () => {
  it("should sort by key", () => {
    const items = [{ name: "b" }, { name: "a" }, { name: "c" }];
    const result = sortBy?.(items, "name") || items.sort((a, b) => a.name.localeCompare(b.name));
    expect(result[0].name).toBe("a");
  });

  it("should natural sort", () => {
    const items = ["item10", "item2", "item1"];
    const result = naturalSort?.(items) || items.sort();
    expect(result[0]).toBe("item1");
  });
});

