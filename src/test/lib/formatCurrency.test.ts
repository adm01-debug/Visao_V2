import { describe, it, expect } from "vitest";
import { formatCurrency, parseCurrency, formatCompact } from "@/lib/formatCurrency";

describe("lib/formatCurrency", () => {
  describe("formatCurrency", () => {
    it("formats BRL", () => {
      const result = formatCurrency(1234.56);
      expect(result).toContain("R$");
    });
    it("formats USD", () => {
      const result = formatCurrency(99.99, "USD");
      expect(result).toContain("$");
    });
    it("formats EUR", () => {
      const result = formatCurrency(50, "EUR");
      expect(result).toContain("€");
    });
    it("handles zero", () => expect(formatCurrency(0)).toContain("0"));
    it("handles negative", () => expect(formatCurrency(-100)).toContain("100"));
  });

  describe("parseCurrency", () => {
    it("parses number string", () => expect(parseCurrency("1234")).toBe(1234));
    it("parses with comma decimal", () => expect(parseCurrency("99,99")).toBeCloseTo(99.99));
    it("strips non-numeric", () => expect(parseCurrency("R$ 100")).toBe(100));
    it("returns 0 for invalid", () => expect(parseCurrency("abc")).toBe(0));
    it("handles empty", () => expect(parseCurrency("")).toBe(0));
  });

  describe("formatCompact", () => {
    it("formats billions", () => expect(formatCompact(2500000000)).toBe("2.5B"));
    it("formats millions", () => expect(formatCompact(1500000)).toBe("1.5M"));
    it("formats thousands", () => expect(formatCompact(2500)).toBe("2.5K"));
    it("returns number for small", () => expect(formatCompact(42)).toBe("42"));
    it("handles zero", () => expect(formatCompact(0)).toBe("0"));
    it("boundary: 1000", () => expect(formatCompact(1000)).toBe("1.0K"));
  });
});
