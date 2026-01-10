import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useEffectOnce } from "../useEffectOnce";

describe("useEffectOnce Integration", () => {
  it("should run effect only once", () => {
    const effect = vi.fn();
    const { rerender } = renderHook(() => useEffectOnce(effect));

    expect(effect).toHaveBeenCalledTimes(1);

    rerender();
    expect(effect).toHaveBeenCalledTimes(1);
  });
});

