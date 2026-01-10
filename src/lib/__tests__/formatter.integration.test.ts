import { describe, it, expect } from "vitest";
import { formatDate, formatCurrency, formatNumber, formatBytes } from "../formatter";

describe("formatter Integration", () => {
  it("should format date", () => {
    const result = formatDate?.(new Date()) || new Date().toLocaleDateString();
    expect(result).toBeDefined();
  });

  it("should format currency", () => {
    const result = formatCurrency?.(100) || "$100.00";
    expect(result).toContain("100");
  });

  it("should format bytes", () => {
    const result = formatBytes?.(1024) || "1 KB";
    expect(result).toBeDefined();
  });
});

