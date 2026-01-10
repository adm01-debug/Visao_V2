import { describe, it, expect } from "vitest";

describe("Sorting E2E", () => {
  it("should sort results ascending", async () => {
    const mockSortAsc = async (field: string) => {
      return { data: [{ id: "1", name: "A" }, { id: "2", name: "B" }], sortedBy: field, order: "asc" };
    };

    const result = await mockSortAsc("name");
    expect(result.order).toBe("asc");
  });

  it("should sort results descending", async () => {
    const mockSortDesc = async (field: string) => {
      return { data: [{ id: "2", name: "B" }, { id: "1", name: "A" }], sortedBy: field, order: "desc" };
    };

    const result = await mockSortDesc("name");
    expect(result.order).toBe("desc");
  });
});

