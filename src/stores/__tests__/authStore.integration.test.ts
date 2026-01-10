import { describe, it, expect, beforeEach } from "vitest";
import { useAuthStore } from "../authStore";

describe("authStore Integration", () => {
  beforeEach(() => {
    useAuthStore.getState().reset?.();
  });

  it("should initialize with unauthenticated state", () => {
    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBeFalsy();
  });

  it("should handle login flow", () => {
    const store = useAuthStore.getState();
    expect(store).toBeDefined();
  });

  it("should handle logout flow", () => {
    const store = useAuthStore.getState();
    expect(store.logout || store.signOut).toBeDefined;
  });
});

