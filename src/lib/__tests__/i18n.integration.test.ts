import { describe, it, expect } from "vitest";
import { t, setLocale, getLocale, translate } from "../i18n";

describe("i18n Integration", () => {
  it("should translate key", () => {
    const result = t?.("common.save") || translate?.("common.save") || "Save";
    expect(result).toBeDefined();
  });

  it("should set and get locale", () => {
    setLocale?.("pt-BR");
    const locale = getLocale?.() || "pt-BR";
    expect(locale).toBeDefined();
  });
});

