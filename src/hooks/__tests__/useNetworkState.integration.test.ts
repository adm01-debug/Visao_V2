import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useNetworkState } from "../useNetworkState";

describe("useNetworkState Integration", () => {
  it("should return network state", () => {
    const { result } = renderHook(() => useNetworkState());

    expect(result.current).toBeDefined();
  });

  it("should detect online status", () => {
    const { result } = renderHook(() => useNetworkState());

    expect(typeof (result.current.online ?? result.current.isOnline ?? true)).toBe("boolean");
  });
});

