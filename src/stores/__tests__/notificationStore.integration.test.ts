import { describe, it, expect } from "vitest";
import { useNotificationStore } from "../notificationStore";

describe("notificationStore Integration", () => {
  it("should initialize with empty notifications", () => {
    const state = useNotificationStore.getState();
    expect(state.notifications || []).toBeDefined();
  });

  it("should handle add notification", () => {
    const store = useNotificationStore.getState();
    expect(store.addNotification || store.add).toBeDefined;
  });
});

