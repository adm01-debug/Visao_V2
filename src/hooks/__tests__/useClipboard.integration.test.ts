import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useClipboard } from "../useClipboard";

describe("useClipboard Integration", () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
        readText: vi.fn().mockResolvedValue("test"),
      },
    });
  });

  it("should provide copy function", () => {
    const { result } = renderHook(() => useClipboard());

    expect(result.current.copy ?? result.current.copyToClipboard).toBeDefined();
  });
});

