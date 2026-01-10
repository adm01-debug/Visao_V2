import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useIsFirstRender } from "../useIsFirstRender";

describe("useIsFirstRender Integration", () => {
  it("should return true on first render", () => {
    const { result } = renderHook(() => useIsFirstRender());

    expect(result.current).toBe(true);
  });

  it("should return false on subsequent renders", () => {
    const { result, rerender } = renderHook(() => useIsFirstRender());

    expect(result.current).toBe(true);

    rerender();
    expect(result.current).toBe(false);
  });
});

