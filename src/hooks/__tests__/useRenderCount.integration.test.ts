import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useRenderCount } from "../useRenderCount";

describe("useRenderCount Integration", () => {
  it("should count renders", () => {
    const { result, rerender } = renderHook(() => useRenderCount());

    expect(result.current).toBe(1);

    rerender();
    expect(result.current).toBe(2);

    rerender();
    expect(result.current).toBe(3);
  });
});

