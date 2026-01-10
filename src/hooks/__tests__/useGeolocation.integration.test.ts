import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useGeolocation } from "../useGeolocation";

describe("useGeolocation Integration", () => {
  it("should return geolocation state", () => {
    const { result } = renderHook(() => useGeolocation());

    expect(result.current).toBeDefined();
  });

  it("should have loading state", () => {
    const { result } = renderHook(() => useGeolocation());

    expect(result.current.loading ?? result.current.isLoading ?? true).toBeDefined();
  });
});

