import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useStep } from "../useStep";

describe("useStep Integration", () => {
  it("should initialize with default step", () => {
    const { result } = renderHook(() => useStep(5));

    expect(result.current.currentStep ?? result.current[0]).toBe(1);
  });

  it("should navigate to next step", () => {
    const { result } = renderHook(() => useStep(5));

    act(() => {
      (result.current.next ?? result.current.goToNextStep ?? result.current[1])();
    });

    expect(result.current.currentStep ?? result.current[0]).toBe(2);
  });
});

