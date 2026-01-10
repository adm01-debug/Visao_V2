import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useUpdateEffect } from "../useUpdateEffect";

describe("useUpdateEffect Integration", () => {
  it("should not run on mount", () => {
    const effect = vi.fn();
    renderHook(() => useUpdateEffect(effect, []));

    expect(effect).not.toHaveBeenCalled();
  });

  it("should run on update", () => {
    const effect = vi.fn();
    const { rerender } = renderHook(
      ({ dep }) => useUpdateEffect(effect, [dep]),
      { initialProps: { dep: 1 } }
    );

    expect(effect).not.toHaveBeenCalled();

    rerender({ dep: 2 });
    expect(effect).toHaveBeenCalledTimes(1);
  });
});

