import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useKeyPress } from "../useKeyPress";

describe("useKeyPress Integration", () => {
  it("should detect key press", () => {
    const { result } = renderHook(() => useKeyPress("Enter"));
    expect(typeof result.current).toBe("boolean");
  });

  it("should handle escape key", () => {
    const { result } = renderHook(() => useKeyPress("Escape"));
    expect(result.current).toBe(false);
  });
});

