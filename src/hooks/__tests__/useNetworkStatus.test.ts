import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useNetworkStatus } from "../useNetworkStatus";

describe("useNetworkStatus", () => {
  beforeEach(() => {
    vi.stubGlobal("navigator", { onLine: true });
  });

  it("should return online status", () => {
    const { result } = renderHook(() => useNetworkStatus());
    expect(result.current.online).toBe(true);
  });

  it("should have network info properties", () => {
    const { result } = renderHook(() => useNetworkStatus());
    expect(typeof result.current.online).toBe("boolean");
  });
});
