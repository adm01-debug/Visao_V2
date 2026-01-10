import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCopyToClipboard } from "../useCopyToClipboard";

describe("useCopyToClipboard Integration", () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it("should provide copy function", () => {
    const { result } = renderHook(() => useCopyToClipboard());
    expect(result.current.copy || result.current[1]).toBeDefined();
  });

  it("should track copied state", () => {
    const { result } = renderHook(() => useCopyToClipboard());
    expect(result.current.copied ?? result.current[0]).toBeDefined();
  });
});

