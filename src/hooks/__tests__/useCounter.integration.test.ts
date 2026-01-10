import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCounter } from "../useCounter";

describe("useCounter Integration", () => {
  it("should initialize with default value", () => {
    const { result } = renderHook(() => useCounter(0));

    expect(result.current.count ?? result.current[0]).toBe(0);
  });

  it("should increment counter", () => {
    const { result } = renderHook(() => useCounter(0));

    act(() => {
      (result.current.increment ?? result.current[1])();
    });

    expect(result.current.count ?? result.current[0]).toBe(1);
  });
});

