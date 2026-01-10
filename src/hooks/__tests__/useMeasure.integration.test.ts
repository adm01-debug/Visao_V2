import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useMeasure } from "../useMeasure";

describe("useMeasure Integration", () => {
  it("should return ref and bounds", () => {
    const { result } = renderHook(() => useMeasure());

    expect(result.current.ref ?? result.current[0]).toBeDefined();
    expect(result.current.bounds ?? result.current[1]).toBeDefined();
  });
});

