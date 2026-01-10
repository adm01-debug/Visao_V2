import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useWindowSize } from "../useWindowSize";

describe("useWindowSize Integration", () => {
  it("should return window dimensions", () => {
    const { result } = renderHook(() => useWindowSize());

    expect(result.current).toHaveProperty("width");
    expect(result.current).toHaveProperty("height");
  });

  it("should have numeric values", () => {
    const { result } = renderHook(() => useWindowSize());

    expect(typeof result.current.width).toBe("number");
    expect(typeof result.current.height).toBe("number");
  });
});

