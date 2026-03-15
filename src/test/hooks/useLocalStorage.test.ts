import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLocalStorage } from "@/hooks/useLocalStorage";

describe("useLocalStorage", () => {
  beforeEach(() => { localStorage.clear(); });

  it("returns initial value when empty", () => {
    const { result } = renderHook(() => useLocalStorage("key", "default"));
    expect(result.current[0]).toBe("default");
  });

  it("persists value", () => {
    const { result } = renderHook(() => useLocalStorage("key", "default"));
    act(() => result.current[1]("updated"));
    expect(result.current[0]).toBe("updated");
  });

  it("stores complex objects", () => {
    const { result } = renderHook(() => useLocalStorage("obj", { a: 1 }));
    act(() => result.current[1]({ a: 2, b: 3 }));
    expect(result.current[0]).toEqual({ a: 2, b: 3 });
  });

  it("removeValue resets to initial", () => {
    const { result } = renderHook(() => useLocalStorage("key", "default"));
    act(() => result.current[1]("changed"));
    act(() => result.current[2]());
    expect(result.current[0]).toBe("default");
  });

  it("handles arrays", () => {
    const { result } = renderHook(() => useLocalStorage("arr", [1, 2]));
    act(() => result.current[1]([1, 2, 3]));
    expect(result.current[0]).toEqual([1, 2, 3]);
  });

  it("handles boolean", () => {
    const { result } = renderHook(() => useLocalStorage("bool", false));
    act(() => result.current[1](true));
    expect(result.current[0]).toBe(true);
  });

  it("handles number", () => {
    const { result } = renderHook(() => useLocalStorage("num", 0));
    act(() => result.current[1](42));
    expect(result.current[0]).toBe(42);
  });
});
