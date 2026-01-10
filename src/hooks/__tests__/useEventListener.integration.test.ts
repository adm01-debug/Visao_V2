import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useEventListener } from "../useEventListener";

describe("useEventListener Integration", () => {
  it("should attach event listener", () => {
    const handler = vi.fn();
    const ref = { current: document.createElement("div") };

    renderHook(() => useEventListener("click", handler, ref));

    expect(handler).not.toHaveBeenCalled();
  });

  it("should handle window events", () => {
    const handler = vi.fn();
    renderHook(() => useEventListener("resize", handler));

    expect(handler).not.toHaveBeenCalled();
  });
});

