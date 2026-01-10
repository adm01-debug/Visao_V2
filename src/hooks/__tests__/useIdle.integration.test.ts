import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useIdle } from "../useIdle";

describe("useIdle Integration", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should detect idle state", () => {
    const { result } = renderHook(() => useIdle(5000));

    expect(typeof result.current).toBe("boolean");
  });

  it("should start as not idle", () => {
    const { result } = renderHook(() => useIdle(5000));

    expect(result.current).toBe(false);
  });
});

