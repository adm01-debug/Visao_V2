import { describe, it, expect } from "vitest";
import { formatBytes, formatPercentage, formatCurrency } from "@/utils/format";

describe("format utils", () => {
  describe("formatBytes", () => {
    it("formats byte sizes", () => {
      expect(formatBytes(0)).toBe("0 B");
      expect(formatBytes(1023)).toBe("1023 B");
      expect(formatBytes(1024)).toBe("1 KB");
      expect(formatBytes(1536)).toBe("1.5 KB");
      expect(formatBytes(1048576)).toBe("1 MB");
      expect(formatBytes(1073741824)).toBe("1 GB");
      expect(formatBytes(1099511627776)).toBe("1 TB");
    });
  });

  describe("formatPercentage", () => {
    it("formats percentages", () => {
      expect(formatPercentage(50)).toBe("50.0%");
      expect(formatPercentage(99.99, 2)).toBe("99.99%");
      expect(formatPercentage(0)).toBe("0.0%");
      expect(formatPercentage(100, 0)).toBe("100%");
    });
  });

  describe("formatCurrency", () => {
    it("formats BRL", () => {
      const result = formatCurrency(1234.56);
      expect(result).toContain("1.234,56");
    });
  });
});
