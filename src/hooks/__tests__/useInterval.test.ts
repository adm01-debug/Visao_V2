import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useInterval } from "../useInterval";

describe("useInterval", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should call callback at interval", () => {
    const callback = vi.fn();
    renderHook(() => useInterval(callback, 1000));
    vi.advanceTimersByTime(3000);
    expect(callback).toHaveBeenCalledTimes(3);
  });

  it("should not call callback when delay is null", () => {
    const callback = vi.fn();
    renderHook(() => useInterval(callback, null));
    vi.advanceTimersByTime(3000);
    expect(callback).not.toHaveBeenCalled();
  });

  it("should clear interval on unmount", () => {
    const callback = vi.fn();
    const { unmount } = renderHook(() => useInterval(callback, 1000));
    unmount();
    vi.advanceTimersByTime(3000);
    expect(callback).not.toHaveBeenCalled();
  });
});
