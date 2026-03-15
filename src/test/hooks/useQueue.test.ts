import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useQueue } from "@/hooks/useQueue";

describe("useQueue", () => {
  it("initializes empty", () => {
    const { result } = renderHook(() => useQueue<number>());
    expect(result.current.queue).toEqual([]);
    expect(result.current.size).toBe(0);
    expect(result.current.isEmpty).toBe(true);
  });
  it("enqueue adds to end", () => {
    const { result } = renderHook(() => useQueue<number>());
    act(() => result.current.enqueue(1));
    act(() => result.current.enqueue(2));
    expect(result.current.queue).toEqual([1, 2]);
    expect(result.current.size).toBe(2);
  });
  it("peek returns first without removing", () => {
    const { result } = renderHook(() => useQueue([10, 20, 30]));
    expect(result.current.peek()).toBe(10);
    expect(result.current.size).toBe(3);
  });
  it("clear empties queue", () => {
    const { result } = renderHook(() => useQueue([1, 2, 3]));
    act(() => result.current.clear());
    expect(result.current.isEmpty).toBe(true);
  });
  it("isEmpty reflects state", () => {
    const { result } = renderHook(() => useQueue<number>());
    expect(result.current.isEmpty).toBe(true);
    act(() => result.current.enqueue(1));
    expect(result.current.isEmpty).toBe(false);
  });
});
