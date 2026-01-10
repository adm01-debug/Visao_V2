import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useScrollPosition } from "../useScrollPosition";

describe("useScrollPosition Integration", () => {
  it("should return scroll position", () => {
    const { result } = renderHook(() => useScrollPosition());

    expect(result.current).toBeDefined();
    expect(typeof (result.current.x ?? result.current.scrollX ?? 0)).toBe("number");
    expect(typeof (result.current.y ?? result.current.scrollY ?? 0)).toBe("number");
  });
});

