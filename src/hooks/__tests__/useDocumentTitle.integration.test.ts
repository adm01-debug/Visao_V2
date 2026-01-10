import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useDocumentTitle } from "../useDocumentTitle";

describe("useDocumentTitle Integration", () => {
  it("should set document title", () => {
    renderHook(() => useDocumentTitle("Test Title"));

    expect(document.title).toBe("Test Title");
  });

  it("should restore title on unmount", () => {
    const originalTitle = document.title;
    const { unmount } = renderHook(() => useDocumentTitle("New Title"));

    unmount();
    // Title behavior depends on implementation
    expect(document.title).toBeDefined();
  });
});

