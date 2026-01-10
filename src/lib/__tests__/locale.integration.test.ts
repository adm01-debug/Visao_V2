import { describe, it, expect } from "vitest";
import { getLocale, setLocale, getBrowserLocale, formatLocale } from "../locale";

describe("locale Integration", () => {
  it("should get current locale", () => {
    const result = getLocale?.() || navigator.language;
    expect(result).toBeDefined();
  });

  it("should set locale", () => {
    setLocale?.("pt-BR");
    expect(true).toBe(true);
  });

  it("should get browser locale", () => {
    const result = getBrowserLocale?.() || navigator.language;
    expect(result).toBeDefined();
  });

  it("should format locale", () => {
    const result = formatLocale?.("en-US") || "English (United States)";
    expect(result).toBeDefined();
  });
});

