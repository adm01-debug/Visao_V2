import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCounter } from "@/hooks/useCounter";

describe("useCounter", () => {
  it("defaults to 0", () => {
    const { result } = renderHook(() => useCounter());
    expect(result.current.count).toBe(0);
  });
  it("accepts initial value", () => {
    const { result } = renderHook(() => useCounter({ initialValue: 10 }));
    expect(result.current.count).toBe(10);
  });
  it("increments by step", () => {
    const { result } = renderHook(() => useCounter({ step: 5 }));
    act(() => result.current.increment());
    expect(result.current.count).toBe(5);
  });
  it("decrements by step", () => {
    const { result } = renderHook(() => useCounter({ initialValue: 10, step: 3 }));
    act(() => result.current.decrement());
    expect(result.current.count).toBe(7);
  });
  it("respects max", () => {
    const { result } = renderHook(() => useCounter({ initialValue: 9, max: 10 }));
    act(() => result.current.increment());
    expect(result.current.count).toBe(10);
    act(() => result.current.increment());
    expect(result.current.count).toBe(10);
  });
  it("respects min", () => {
    const { result } = renderHook(() => useCounter({ initialValue: 1, min: 0 }));
    act(() => result.current.decrement());
    expect(result.current.count).toBe(0);
    act(() => result.current.decrement());
    expect(result.current.count).toBe(0);
  });
  it("resets to initial", () => {
    const { result } = renderHook(() => useCounter({ initialValue: 5 }));
    act(() => result.current.increment());
    act(() => result.current.reset());
    expect(result.current.count).toBe(5);
  });
  it("set clamps to min/max", () => {
    const { result } = renderHook(() => useCounter({ min: 0, max: 100 }));
    act(() => result.current.set(200));
    expect(result.current.count).toBe(100);
    act(() => result.current.set(-10));
    expect(result.current.count).toBe(0);
  });
});
