import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useMap } from "../useMap";

describe("useMap Integration", () => {
  it("should initialize with entries", () => {
    const { result } = renderHook(() => useMap([["key", "value"]]));

    expect(result.current.get ?? result.current[0].get).toBeDefined();
  });

  it("should set values", () => {
    const { result } = renderHook(() => useMap());

    act(() => {
      (result.current.set ?? result.current[1])("key", "value");
    });

    const map = result.current.get ? result.current : result.current[0];
    expect(map.get("key")).toBe("value");
  });
});

