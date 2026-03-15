import { describe, it, expect } from "vitest";
import { formatNumber, formatPercent, formatBytes, formatCurrency, formatDuration } from "@/lib/formatters";

describe("lib/formatters", () => {
  describe("formatNumber", () => {
    it("formats with default decimals", () => {
      const result = formatNumber(1234);
      expect(result).toContain("1");
    });
    it("formats with decimals", () => {
      const result = formatNumber(1234.567, 2);
      expect(result).toBeTruthy();
    });
    it("handles zero", () => {
      expect(formatNumber(0)).toBeTruthy();
    });
    it("handles negative", () => {
      const result = formatNumber(-500);
      expect(result).toContain("500");
    });
  });

  describe("formatPercent", () => {
    it("formats percentages", () => {
      expect(formatPercent(50)).toBe("50.0%");
      expect(formatPercent(99.99, 2)).toBe("99.99%");
      expect(formatPercent(0, 0)).toBe("0%");
      expect(formatPercent(100)).toBe("100.0%");
    });
  });

  describe("formatBytes", () => {
    it("formats zero", () => {
      expect(formatBytes(0)).toBe("0 Bytes");
    });
    it("formats bytes", () => {
      expect(formatBytes(500)).toContain("Bytes");
    });
    it("formats KB", () => {
      expect(formatBytes(1024)).toContain("KB");
    });
    it("formats MB", () => {
      expect(formatBytes(1048576)).toContain("MB");
    });
    it("formats GB", () => {
      expect(formatBytes(1073741824)).toContain("GB");
    });
    it("respects decimals param", () => {
      const result = formatBytes(1536, 1);
      expect(result).toContain("KB");
    });
  });

  describe("formatCurrency", () => {
    it("formats BRL", () => {
      const result = formatCurrency(1234.56);
      expect(result).toContain("R$");
    });
    it("handles zero", () => {
      const result = formatCurrency(0);
      expect(result).toContain("0");
    });
    it("handles negative", () => {
      const result = formatCurrency(-100);
      expect(result).toContain("100");
    });
  });

  describe("formatDuration", () => {
    it("formats correctly", () => {
      expect(formatDuration(0)).toBe("0s");
      expect(formatDuration(65)).toBe("1m 5s");
      expect(formatDuration(3600)).toBe("1h 0m 0s");
    });
  });
});
