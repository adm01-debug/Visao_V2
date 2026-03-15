import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useDebounce } from "@/hooks/useDebounce";

describe("useDebounce", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("returns initial value immediately", () => {
    const { result } = renderHook(() => useDebounce("hello", 500));
    expect(result.current).toBe("hello");
  });

  it("updates after delay", () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: "a", delay: 300 } }
    );
    rerender({ value: "b", delay: 300 });
    expect(result.current).toBe("a");
    vi.advanceTimersByTime(300);
    expect(result.current).toBe("b");
  });

  it("resets timer on rapid changes", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 500),
      { initialProps: { value: "a" } }
    );
    rerender({ value: "b" });
    vi.advanceTimersByTime(200);
    rerender({ value: "c" });
    vi.advanceTimersByTime(200);
    expect(result.current).toBe("a"); // still initial
    vi.advanceTimersByTime(300);
    expect(result.current).toBe("c"); // last value
  });

  it("uses default delay of 300", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value),
      { initialProps: { value: 1 } }
    );
    rerender({ value: 2 });
    vi.advanceTimersByTime(299);
    expect(result.current).toBe(1);
    vi.advanceTimersByTime(1);
    expect(result.current).toBe(2);
  });
});
