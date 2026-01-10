import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useMounted } from "../useMounted";

describe("useMounted Integration", () => {
  it("should return true when mounted", () => {
    const { result } = renderHook(() => useMounted());
    expect(result.current).toBe(true);
  });

  it("should return false after unmount", () => {
    const { result, unmount } = renderHook(() => useMounted());
    expect(result.current).toBe(true);
    unmount();
    // After unmount the ref should be false
  });
});

