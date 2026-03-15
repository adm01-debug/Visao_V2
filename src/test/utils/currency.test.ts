import { describe, it, expect } from "vitest";
import {
  formatCurrency, formatCurrencyAdvanced, parseCurrency,
  centsToCurrency, currencyToCents, formatCompact, formatCompactLong,
  formatPercent, formatNumber, formatDecimal, calculateDiscount, calculateWithTax,
} from "@/utils/currency";

describe("currency utils", () => {
  describe("formatCurrency", () => {
    it("formats BRL default", () => {
      const result = formatCurrency(1234.56);
      expect(result).toContain("R$");
      expect(result).toContain("1.234");
    });
    it("formats USD", () => {
      const result = formatCurrency(99.99, "USD", "en-US");
      expect(result).toContain("$");
    });
    it("formats EUR", () => {
      const result = formatCurrency(50, "EUR", "de-DE");
      expect(result).toContain("€");
    });
    it("handles zero", () => {
      expect(formatCurrency(0)).toContain("0");
    });
    it("handles negative", () => {
      const result = formatCurrency(-100);
      expect(result).toContain("100");
    });
  });

  describe("formatCurrencyAdvanced", () => {
    it("formats with custom options", () => {
      const result = formatCurrencyAdvanced(1234.5, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
      expect(result).toContain("R$");
    });
    it("uses defaults", () => {
      const result = formatCurrencyAdvanced(99.99);
      expect(result).toContain("R$");
    });
  });

  describe("parseCurrency", () => {
    it("parses BR format (1.234,56)", () => {
      expect(parseCurrency("R$ 1.234,56")).toBeCloseTo(1234.56);
    });
    it("parses US format (1,234.56)", () => {
      expect(parseCurrency("$1,234.56")).toBeCloseTo(1234.56);
    });
    it("parses comma-only (BR decimal)", () => {
      expect(parseCurrency("99,99")).toBeCloseTo(99.99);
    });
    it("parses plain number", () => {
      expect(parseCurrency("100")).toBe(100);
    });
    it("handles negative", () => {
      expect(parseCurrency("-50,00")).toBeCloseTo(-50);
    });
  });

  describe("centsToCurrency / currencyToCents", () => {
    it("converts cents to currency", () => {
      expect(centsToCurrency(1234)).toBe(12.34);
      expect(centsToCurrency(0)).toBe(0);
      expect(centsToCurrency(1)).toBe(0.01);
    });
    it("converts currency to cents", () => {
      expect(currencyToCents(12.34)).toBe(1234);
      expect(currencyToCents(0)).toBe(0);
      expect(currencyToCents(0.01)).toBe(1);
    });
    it("roundtrips correctly", () => {
      expect(centsToCurrency(currencyToCents(99.99))).toBe(99.99);
    });
    it("handles floating point (0.1 + 0.2)", () => {
      expect(currencyToCents(0.1 + 0.2)).toBe(30); // rounded correctly
    });
  });

  describe("formatCompact", () => {
    it("formats thousands", () => {
      const result = formatCompact(1500);
      expect(result).toBeTruthy();
    });
    it("formats millions", () => {
      const result = formatCompact(2500000);
      expect(result).toBeTruthy();
    });
    it("formats small numbers", () => {
      expect(formatCompact(42)).toBeTruthy();
    });
  });

  describe("formatPercent", () => {
    it("formats 50%", () => {
      const result = formatPercent(0.5);
      expect(result).toContain("50");
    });
    it("formats 100%", () => {
      const result = formatPercent(1.0);
      expect(result).toContain("100");
    });
  });

  describe("formatNumber", () => {
    it("formats with locale separators", () => {
      const result = formatNumber(1234567);
      expect(result).toContain("1.234.567");
    });
  });

  describe("formatDecimal", () => {
    it("formats with specific decimals", () => {
      const result = formatDecimal(3.14159, 2);
      expect(result).toContain("3,14");
    });
  });

  describe("calculateDiscount", () => {
    it("calculates 10% discount", () => {
      const { discount, final: finalPrice } = calculateDiscount(100, 10);
      expect(discount).toBe(10);
      expect(finalPrice).toBe(90);
    });
    it("calculates 50% discount", () => {
      const { discount, final: finalPrice } = calculateDiscount(200, 50);
      expect(discount).toBe(100);
      expect(finalPrice).toBe(100);
    });
    it("0% discount", () => {
      const { discount, final: finalPrice } = calculateDiscount(100, 0);
      expect(discount).toBe(0);
      expect(finalPrice).toBe(100);
    });
    it("handles decimals", () => {
      const { discount } = calculateDiscount(99.99, 15);
      expect(typeof discount).toBe("number");
      expect(discount).toBeCloseTo(15, 0);
    });
  });

  describe("calculateWithTax", () => {
    it("calculates 10% tax", () => {
      const { tax, total } = calculateWithTax(100, 10);
      expect(tax).toBe(10);
      expect(total).toBe(110);
    });
    it("calculates 0% tax", () => {
      const { tax, total } = calculateWithTax(100, 0);
      expect(tax).toBe(0);
      expect(total).toBe(100);
    });
    it("handles decimals", () => {
      const { tax, total } = calculateWithTax(99.99, 18);
      expect(tax).toBeCloseTo(18, 0);
      expect(total).toBeCloseTo(117.99, 0);
    });
  });
});
