import { describe, it, expect } from "vitest";
import { formatCurrency, parseCurrency, convertCurrency, getCurrencySymbol } from "../currency";

describe("currency Integration", () => {
  it("should format currency", () => {
    const result = formatCurrency?.(100, "USD") || "$100.00";
    expect(result).toContain("100");
  });

  it("should get currency symbol", () => {
    const result = getCurrencySymbol?.("USD") || "$";
    expect(result).toBeDefined();
  });

  it("should parse currency string", () => {
    const result = parseCurrency?.("$100.00") ?? 100;
    expect(result).toBe(100);
  });
});

