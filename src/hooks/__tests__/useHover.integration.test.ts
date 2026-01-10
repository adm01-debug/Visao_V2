import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useHover } from "../useHover";

describe("useHover Integration", () => {
  it("should return ref and hover state", () => {
    const { result } = renderHook(() => useHover());

    expect(result.current.ref || result.current[0]).toBeDefined();
    expect(typeof (result.current.isHovered ?? result.current[1])).toBe("boolean");
  });

  it("should initialize as not hovered", () => {
    const { result } = renderHook(() => useHover());

    expect(result.current.isHovered ?? result.current[1]).toBe(false);
  });
});

