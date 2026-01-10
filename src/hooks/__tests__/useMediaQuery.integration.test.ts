import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useMediaQuery } from "../useMediaQuery";

describe("useMediaQuery Integration", () => {
  it("should return boolean for media query", () => {
    const { result } = renderHook(() => 
      useMediaQuery("(min-width: 768px)")
    );

    expect(typeof result.current).toBe("boolean");
  });

  it("should handle mobile query", () => {
    const { result } = renderHook(() => 
      useMediaQuery("(max-width: 640px)")
    );

    expect(typeof result.current).toBe("boolean");
  });
});

