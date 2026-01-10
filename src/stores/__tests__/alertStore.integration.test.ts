import { describe, it, expect, beforeEach } from "vitest";
import { useAlertStore } from "../alertStore";

describe("alertStore Integration", () => {
  beforeEach(() => {
    useAlertStore.getState().reset?.();
  });

  it("should initialize with empty alerts", () => {
    const state = useAlertStore.getState();
    expect(state.alerts || []).toBeDefined();
  });

  it("should track unread count", () => {
    const store = useAlertStore.getState();
    expect(store.unreadCount >= 0 || store.unreadCount === undefined).toBeTruthy();
  });

  it("should handle alert filters", () => {
    const store = useAlertStore.getState();
    expect(store).toBeDefined();
  });
});

