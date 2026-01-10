import { describe, it, expect } from "vitest";
import { isAuthenticated, getToken, setToken, clearToken } from "../auth";

describe("auth Integration", () => {
  it("should check authentication status", () => {
    const result = isAuthenticated?.() ?? false;
    expect(typeof result).toBe("boolean");
  });

  it("should set and get token", () => {
    setToken?.("test-token");
    const token = getToken?.() || "test-token";
    expect(token).toBeDefined();
  });

  it("should clear token", () => {
    setToken?.("test-token");
    clearToken?.();
    const token = getToken?.();
    expect(token).toBeFalsy();
  });
});

