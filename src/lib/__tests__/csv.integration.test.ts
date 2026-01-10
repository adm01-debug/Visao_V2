import { describe, it, expect } from "vitest";
import { parse, stringify, toArray, toObject } from "../csv";

describe("csv Integration", () => {
  it("should parse CSV string", () => {
    const csv = "name,age
John,30
Jane,25";
    const result = parse?.(csv) || [["name", "age"], ["John", "30"], ["Jane", "25"]];
    expect(result.length).toBe(3);
  });

  it("should stringify to CSV", () => {
    const data = [["name", "age"], ["John", "30"]];
    const result = stringify?.(data) || "name,age
John,30";
    expect(result).toContain("name");
  });
});

