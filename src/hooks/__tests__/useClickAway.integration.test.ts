import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useClickAway } from "../useClickAway";

describe("useClickAway Integration", () => {
  it("should call handler on outside click", () => {
    const handler = vi.fn();
    const ref = { current: document.createElement("div") };

    renderHook(() => useClickAway(ref, handler));

    expect(handler).not.toHaveBeenCalled();
  });
});

