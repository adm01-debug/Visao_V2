import { describe, it, expect, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useDocumentTitle } from "../useDocumentTitle";

describe("useDocumentTitle", () => {
  const originalTitle = document.title;

  afterEach(() => {
    document.title = originalTitle;
  });

  it("should set document title", () => {
    renderHook(() => useDocumentTitle("Test Page"));
    expect(document.title).toBe("Test Page | VISÃO");
  });

  it("should use default title when empty", () => {
    renderHook(() => useDocumentTitle(""));
    expect(document.title).toBe("VISÃO");
  });
});
