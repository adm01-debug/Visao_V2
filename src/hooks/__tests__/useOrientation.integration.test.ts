import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useOrientation } from "../useOrientation";

describe("useOrientation Integration", () => {
  it("should return orientation state", () => {
    const { result } = renderHook(() => useOrientation());

    expect(result.current).toBeDefined();
  });

  it("should have type property", () => {
    const { result } = renderHook(() => useOrientation());

    expect(result.current.type ?? result.current.orientation).toBeDefined();
  });
});

