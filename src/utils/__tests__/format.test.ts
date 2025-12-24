import { describe, it, expect } from "vitest";
import { formatBytes, formatNumber, formatPercentage, formatCurrency } from "../format";

describe("format utils", () => {
  describe("formatBytes", () => {
    it("should return 0 B for zero", () => {
      expect(formatBytes(0)).toBe("0 B");
    });

    it("should format bytes", () => {
      expect(formatBytes(500)).toContain("B");
    });

    it("should format kilobytes", () => {
      expect(formatBytes(1024)).toContain("KB");
    });

    it("should format megabytes", () => {
      expect(formatBytes(1024 * 1024)).toContain("MB");
    });

    it("should format gigabytes", () => {
      expect(formatBytes(1024 * 1024 * 1024)).toContain("GB");
    });
  });

  describe("formatNumber", () => {
    it("should format number with locale", () => {
      const result = formatNumber(1000, "pt-BR");
      expect(result).toMatch(/1\.000|1,000/);
    });

    it("should format large numbers", () => {
      const result = formatNumber(1000000, "pt-BR");
      expect(result).toContain("000");
    });
  });

  describe("formatPercentage", () => {
    it("should format percentage with default decimals", () => {
      expect(formatPercentage(50)).toBe("50.0%");
    });

    it("should format percentage with custom decimals", () => {
      expect(formatPercentage(33.333, 2)).toBe("33.33%");
    });

    it("should handle zero", () => {
      expect(formatPercentage(0)).toBe("0.0%");
    });
  });

  describe("formatCurrency", () => {
    it("should format BRL currency", () => {
      const result = formatCurrency(100, "BRL", "pt-BR");
      expect(result).toMatch(/R\$|100/);
    });

    it("should format USD currency", () => {
      const result = formatCurrency(100, "USD", "en-US");
      expect(result).toMatch(/\$|100/);
    });
  });
});
