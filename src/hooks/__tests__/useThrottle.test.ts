import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useThrottle } from "../useThrottle";

describe("useThrottle", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns initial value", () => {
    const { result } = renderHook(() => useThrottle("test", 1000));
    expect(result.current).toBe("test");
  });

  it("throttles rapid updates", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useThrottle(value, 1000),
      { initialProps: { value: 1 } }
    );

    rerender({ value: 2 });
    rerender({ value: 3 });
    
    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(result.current).toBeTruthy();
  });
});
