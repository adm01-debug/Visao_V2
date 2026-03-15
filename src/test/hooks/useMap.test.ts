import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useMap } from "@/hooks/useMap";

describe("useMap", () => {
  it("initializes empty", () => {
    const { result } = renderHook(() => useMap<string, number>());
    expect(result.current.map.size).toBe(0);
  });
  it("set adds entry", () => {
    const { result } = renderHook(() => useMap<string, number>());
    act(() => result.current.set("a", 1));
    expect(result.current.get("a")).toBe(1);
    expect(result.current.has("a")).toBe(true);
  });
  it("remove deletes entry", () => {
    const { result } = renderHook(() => useMap(new Map([["a", 1]])));
    act(() => result.current.remove("a"));
    expect(result.current.has("a")).toBe(false);
  });
  it("clear empties map", () => {
    const { result } = renderHook(() => useMap(new Map([["a", 1], ["b", 2]])));
    act(() => result.current.clear());
    expect(result.current.map.size).toBe(0);
  });
  it("overwrites existing", () => {
    const { result } = renderHook(() => useMap<string, number>());
    act(() => result.current.set("k", 1));
    act(() => result.current.set("k", 2));
    expect(result.current.get("k")).toBe(2);
  });
  it("get returns undefined for missing", () => {
    const { result } = renderHook(() => useMap<string, number>());
    expect(result.current.get("nope")).toBeUndefined();
  });
});
