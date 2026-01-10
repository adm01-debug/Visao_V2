import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useList } from "../useList";

describe("useList Integration", () => {
  it("should initialize with items", () => {
    const { result } = renderHook(() => useList([1, 2, 3]));

    expect(result.current.list ?? result.current[0]).toHaveLength(3);
  });

  it("should add items", () => {
    const { result } = renderHook(() => useList([]));

    act(() => {
      (result.current.push ?? result.current[1])(4);
    });

    expect(result.current.list ?? result.current[0]).toContain(4);
  });
});

