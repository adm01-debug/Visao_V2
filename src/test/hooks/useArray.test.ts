import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useArray } from "@/hooks/useArray";

describe("useArray", () => {
  it("initializes with empty array", () => {
    const { result } = renderHook(() => useArray<number>());
    expect(result.current.array).toEqual([]);
  });
  it("initializes with provided array", () => {
    const { result } = renderHook(() => useArray([1, 2, 3]));
    expect(result.current.array).toEqual([1, 2, 3]);
  });
  it("push adds item", () => {
    const { result } = renderHook(() => useArray<number>());
    act(() => result.current.push(42));
    expect(result.current.array).toEqual([42]);
  });
  it("remove by index", () => {
    const { result } = renderHook(() => useArray([1, 2, 3]));
    act(() => result.current.remove(1));
    expect(result.current.array).toEqual([1, 3]);
  });
  it("update at index", () => {
    const { result } = renderHook(() => useArray([1, 2, 3]));
    act(() => result.current.update(1, 99));
    expect(result.current.array).toEqual([1, 99, 3]);
  });
  it("clear empties array", () => {
    const { result } = renderHook(() => useArray([1, 2, 3]));
    act(() => result.current.clear());
    expect(result.current.array).toEqual([]);
  });
  it("set replaces entire array", () => {
    const { result } = renderHook(() => useArray([1, 2]));
    act(() => result.current.set([10, 20, 30]));
    expect(result.current.array).toEqual([10, 20, 30]);
  });
  it("multiple pushes", () => {
    const { result } = renderHook(() => useArray<string>());
    act(() => { result.current.push("a"); });
    act(() => { result.current.push("b"); });
    act(() => { result.current.push("c"); });
    expect(result.current.array).toEqual(["a", "b", "c"]);
  });
});
