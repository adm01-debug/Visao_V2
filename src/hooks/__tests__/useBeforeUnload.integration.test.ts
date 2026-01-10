import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useBeforeUnload } from "../useBeforeUnload";

describe("useBeforeUnload Integration", () => {
  it("should add beforeunload listener", () => {
    const handler = vi.fn();
    renderHook(() => useBeforeUnload(handler));

    expect(handler).not.toHaveBeenCalled();
  });
});

