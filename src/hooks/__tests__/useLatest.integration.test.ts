import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useLatest } from "../useLatest";

describe("useLatest Integration", () => {
  it("should return ref with latest value", () => {
    const { result, rerender } = renderHook(
      ({ value }) => useLatest(value),
      { initialProps: { value: "first" } }
    );

    expect(result.current.current).toBe("first");

    rerender({ value: "second" });
    expect(result.current.current).toBe("second");
  });
});

