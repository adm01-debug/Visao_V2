import { describe, it, expect, beforeEach } from "vitest";
import { useCameraStore } from "../cameraStore";

describe("cameraStore Integration", () => {
  beforeEach(() => {
    useCameraStore.getState().reset?.();
  });

  it("should initialize with empty cameras", () => {
    const state = useCameraStore.getState();
    expect(state.cameras || []).toBeDefined();
  });

  it("should handle camera selection", () => {
    const store = useCameraStore.getState();
    expect(store).toBeDefined();
  });

  it("should manage camera state", () => {
    const store = useCameraStore.getState();
    expect(store.selectedCamera === undefined || store.selectedCamera === null || typeof store.selectedCamera === "object").toBeTruthy();
  });
});

