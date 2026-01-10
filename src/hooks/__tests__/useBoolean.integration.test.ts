import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useBoolean } from "../useBoolean";

describe("useBoolean Integration", () => {
  it("should initialize with default value", () => {
    const { result } = renderHook(() => useBoolean(false));

    expect(result.current.value ?? result.current[0]).toBe(false);
  });

  it("should toggle value", () => {
    const { result } = renderHook(() => useBoolean(false));

    act(() => {
      (result.current.toggle ?? result.current[1])();
    });

    expect(result.current.value ?? result.current[0]).toBe(true);
  });
});

