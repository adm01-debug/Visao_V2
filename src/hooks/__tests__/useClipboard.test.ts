import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useClipboard } from "../useClipboard";

describe("useClipboard", () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it("should initialize with copied as false", () => {
    const { result } = renderHook(() => useClipboard());
    expect(result.current.copied).toBe(false);
  });

  it("should copy text to clipboard", async () => {
    const { result } = renderHook(() => useClipboard());
    await act(async () => {
      await result.current.copy("test text");
    });
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("test text");
    expect(result.current.copied).toBe(true);
  });

  it("should reset copied after timeout", async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useClipboard(1000));
    await act(async () => {
      await result.current.copy("test");
    });
    expect(result.current.copied).toBe(true);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current.copied).toBe(false);
    vi.useRealTimers();
  });

  it("should handle errors", async () => {
    navigator.clipboard.writeText = vi.fn().mockRejectedValue(new Error("Failed"));
    const { result } = renderHook(() => useClipboard());
    await act(async () => {
      await result.current.copy("test");
    });
    expect(result.current.error).toBeTruthy();
    expect(result.current.copied).toBe(false);
  });
});
