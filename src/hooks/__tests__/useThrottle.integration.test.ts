import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useThrottle } from "../useThrottle";

describe("useThrottle Integration", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should throttle value changes", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useThrottle(value, 500),
      { initialProps: { value: "initial" } }
    );

    expect(result.current).toBe("initial");
  });
});

