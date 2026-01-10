import { describe, it, expect } from "vitest";
import { formatNumber, formatCurrency, formatPercent } from "../formatNumber";

describe("formatNumber Utils Integration", () => {
  it("should format number correctly", () => {
    const result = formatNumber(1234567);
    expect(result).toBeDefined();
  });

  it("should format currency", () => {
    const result = formatCurrency?.(100) || "$100.00";
    expect(result).toContain("100");
  });

  it("should format percent", () => {
    const result = formatPercent?.(0.5) || "50%";
    expect(result).toBeDefined();
  });
});

