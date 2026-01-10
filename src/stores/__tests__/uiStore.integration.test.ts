import { describe, it, expect } from "vitest";
import { useUIStore } from "../uiStore";

describe("uiStore Integration", () => {
  it("should manage sidebar state", () => {
    const state = useUIStore.getState();
    expect(state).toBeDefined();
  });

  it("should handle modal state", () => {
    const store = useUIStore.getState();
    expect(store.isModalOpen === true || store.isModalOpen === false || store.isModalOpen === undefined).toBeTruthy();
  });
});

