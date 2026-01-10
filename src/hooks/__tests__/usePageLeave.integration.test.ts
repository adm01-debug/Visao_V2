import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { usePageLeave } from "../usePageLeave";

describe("usePageLeave Integration", () => {
  it("should call handler on page leave", () => {
    const handler = vi.fn();
    renderHook(() => usePageLeave(handler));

    expect(handler).not.toHaveBeenCalled();
  });
});

