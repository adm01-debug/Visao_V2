import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { usePrevious } from "@/hooks/usePrevious";

describe("usePrevious", () => {
  it("returns undefined on first render", () => {
    const { result } = renderHook(() => usePrevious(0));
    expect(result.current).toBeUndefined();
  });

  it("returns previous value after update", () => {
    const { result, rerender } = renderHook(
      ({ value }) => usePrevious(value),
      { initialProps: { value: 0 } }
    );
    rerender({ value: 1 });
    expect(result.current).toBe(0);
    rerender({ value: 2 });
    expect(result.current).toBe(1);
  });

  it("works with strings", () => {
    const { result, rerender } = renderHook(
      ({ value }) => usePrevious(value),
      { initialProps: { value: "a" } }
    );
    rerender({ value: "b" });
    expect(result.current).toBe("a");
  });

  it("works with objects (reference)", () => {
    const obj1 = { x: 1 };
    const obj2 = { x: 2 };
    const { result, rerender } = renderHook(
      ({ value }) => usePrevious(value),
      { initialProps: { value: obj1 } }
    );
    rerender({ value: obj2 });
    expect(result.current).toBe(obj1);
  });
});
