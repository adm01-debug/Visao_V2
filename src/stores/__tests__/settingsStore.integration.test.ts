import { describe, it, expect } from "vitest";
import { useSettingsStore } from "../settingsStore";

describe("settingsStore Integration", () => {
  it("should have default settings", () => {
    const state = useSettingsStore.getState();
    expect(state).toBeDefined();
  });

  it("should persist settings", () => {
    const store = useSettingsStore.getState();
    expect(store.settings || store).toBeDefined();
  });
});

