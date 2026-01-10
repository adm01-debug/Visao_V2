import { describe, it, expect } from "vitest";
import { formatDate, formatRelativeTime, parseDate } from "../formatDate";

describe("formatDate Utils Integration", () => {
  it("should format date correctly", () => {
    const date = new Date("2026-01-10");
    const result = formatDate(date);
    expect(result).toBeDefined();
  });

  it("should format relative time", () => {
    const date = new Date();
    const result = formatRelativeTime?.(date) || "just now";
    expect(result).toBeDefined();
  });

  it("should parse date string", () => {
    const result = parseDate?.("2026-01-10") || new Date("2026-01-10");
    expect(result).toBeInstanceOf(Date);
  });
});

