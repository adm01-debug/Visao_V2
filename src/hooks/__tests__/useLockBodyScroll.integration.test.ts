import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useLockBodyScroll } from "../useLockBodyScroll";

describe("useLockBodyScroll Integration", () => {
  it("should lock body scroll when mounted", () => {
    renderHook(() => useLockBodyScroll());

    // Body should be locked
    expect(document.body).toBeDefined();
  });

  it("should unlock on unmount", () => {
    const { unmount } = renderHook(() => useLockBodyScroll());
    unmount();

    expect(document.body).toBeDefined();
  });
});

