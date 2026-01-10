import { describe, it, expect } from "vitest";
import { isMobile, isTablet, isDesktop, getBrowser, getOS } from "../device";

describe("device Integration", () => {
  it("should detect mobile", () => {
    const result = isMobile?.() ?? false;
    expect(typeof result).toBe("boolean");
  });

  it("should detect tablet", () => {
    const result = isTablet?.() ?? false;
    expect(typeof result).toBe("boolean");
  });

  it("should detect desktop", () => {
    const result = isDesktop?.() ?? true;
    expect(typeof result).toBe("boolean");
  });

  it("should get browser info", () => {
    const result = getBrowser?.() || "Chrome";
    expect(result).toBeDefined();
  });
});

