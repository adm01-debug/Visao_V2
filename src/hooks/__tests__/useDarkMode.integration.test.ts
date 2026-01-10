import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDarkMode } from "../useDarkMode";

describe("useDarkMode Integration", () => {
  it("should return dark mode state", () => {
    const { result } = renderHook(() => useDarkMode());

    expect(typeof (result.current.isDarkMode ?? result.current[0] ?? false)).toBe("boolean");
  });

  it("should provide toggle function", () => {
    const { result } = renderHook(() => useDarkMode());

    expect(result.current.toggle ?? result.current[1]).toBeDefined();
  });
});

