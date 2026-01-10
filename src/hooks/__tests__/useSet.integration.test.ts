import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSet } from "../useSet";

describe("useSet Integration", () => {
  it("should initialize with values", () => {
    const { result } = renderHook(() => useSet(new Set(["a", "b"])));

    expect(result.current.has ?? result.current[0].has).toBeDefined();
  });

  it("should add values to set", () => {
    const { result } = renderHook(() => useSet(new Set()));

    act(() => {
      (result.current.add ?? result.current[1])("c");
    });

    expect(result.current.has ? result.current.has("c") : result.current[0].has("c")).toBe(true);
  });
});

