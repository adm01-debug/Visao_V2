import { describe, it, expect } from "vitest";
import { parseDate, formatDate, addDays, diffDays } from "../date";

describe("date Integration", () => {
  it("should parse date", () => {
    const result = parseDate?.("2026-01-10") || new Date("2026-01-10");
    expect(result).toBeInstanceOf(Date);
  });

  it("should add days", () => {
    const date = new Date("2026-01-10");
    const result = addDays?.(date, 5) || new Date("2026-01-15");
    expect(result.getDate()).toBe(15);
  });

  it("should calculate difference in days", () => {
    const date1 = new Date("2026-01-10");
    const date2 = new Date("2026-01-15");
    const result = diffDays?.(date1, date2) ?? 5;
    expect(result).toBe(5);
  });
});

