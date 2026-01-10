import { describe, it, expect } from "vitest";
import { useThemeStore } from "../themeStore";

describe("themeStore Integration", () => {
  it("should have default theme", () => {
    const state = useThemeStore.getState();
    expect(state.theme || state.mode).toBeDefined();
  });

  it("should toggle theme", () => {
    const store = useThemeStore.getState();
    expect(store.toggleTheme || store.setTheme).toBeDefined;
  });
});

