import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSet } from "@/hooks/useSet";

describe("useSet", () => {
  it("initializes empty", () => {
    const { result } = renderHook(() => useSet<number>());
    expect(result.current.set.size).toBe(0);
  });
  it("initializes with values", () => {
    const { result } = renderHook(() => useSet(new Set([1, 2, 3])));
    expect(result.current.set.size).toBe(3);
  });
  it("add adds item", () => {
    const { result } = renderHook(() => useSet<number>());
    act(() => result.current.add(1));
    expect(result.current.has(1)).toBe(true);
  });
  it("remove removes item", () => {
    const { result } = renderHook(() => useSet(new Set([1, 2])));
    act(() => result.current.remove(1));
    expect(result.current.has(1)).toBe(false);
    expect(result.current.has(2)).toBe(true);
  });
  it("toggle adds/removes", () => {
    const { result } = renderHook(() => useSet<number>());
    act(() => result.current.toggle(5));
    expect(result.current.has(5)).toBe(true);
    act(() => result.current.toggle(5));
    expect(result.current.has(5)).toBe(false);
  });
  it("clear empties set", () => {
    const { result } = renderHook(() => useSet(new Set([1, 2, 3])));
    act(() => result.current.clear());
    expect(result.current.set.size).toBe(0);
  });
  it("has checks membership", () => {
    const { result } = renderHook(() => useSet(new Set(["a"])));
    expect(result.current.has("a")).toBe(true);
    expect(result.current.has("b")).toBe(false);
  });
});
