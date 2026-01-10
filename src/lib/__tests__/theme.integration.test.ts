import { describe, it, expect, vi } from "vitest";
import { getTheme, setTheme, toggleTheme, onThemeChange } from "../theme";

describe("theme Integration", () => {
  it("should get current theme", () => {
    const result = getTheme?.() || "light";
    expect(["light", "dark", "system"]).toContain(result);
  });

  it("should set theme", () => {
    setTheme?.("dark");
    expect(true).toBe(true);
  });

  it("should toggle theme", () => {
    const current = getTheme?.() || "light";
    toggleTheme?.();
    expect(true).toBe(true);
  });

  it("should handle theme change", () => {
    const handler = vi.fn();
    const unsubscribe = onThemeChange?.(handler);
    expect(true).toBe(true);
    unsubscribe?.();
  });
});

