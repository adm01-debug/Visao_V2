import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useReducedMotion } from "../useReducedMotion";

describe("useReducedMotion Integration", () => {
  it("should return boolean for reduced motion preference", () => {
    const { result } = renderHook(() => useReducedMotion());

    expect(typeof result.current).toBe("boolean");
  });
});

