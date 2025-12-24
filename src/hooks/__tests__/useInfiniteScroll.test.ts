import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { useInfiniteScroll } from "../useInfiniteScroll";

describe("useInfiniteScroll", () => {
  let mockObserve: ReturnType<typeof vi.fn>;
  let mockDisconnect: ReturnType<typeof vi.fn>;
  let mockIntersectionObserver: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockObserve = vi.fn();
    mockDisconnect = vi.fn();
    mockIntersectionObserver = vi.fn().mockImplementation(() => ({
      observe: mockObserve,
      disconnect: mockDisconnect,
      unobserve: vi.fn(),
    }));
    window.IntersectionObserver = mockIntersectionObserver;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("should return a ref", () => {
    const callback = vi.fn();
    const { result } = renderHook(() => useInfiniteScroll(callback));
    expect(result.current).toBeDefined();
    expect(result.current.current).toBeNull();
  });

  it("should create IntersectionObserver with default options", () => {
    const callback = vi.fn();
    renderHook(() => useInfiniteScroll(callback));
    expect(mockIntersectionObserver).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({
        threshold: 0.1,
        rootMargin: "100px",
      })
    );
  });

  it("should create IntersectionObserver with custom options", () => {
    const callback = vi.fn();
    renderHook(() => useInfiniteScroll(callback, { threshold: 0.5, rootMargin: "50px" }));
    expect(mockIntersectionObserver).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({
        threshold: 0.5,
        rootMargin: "50px",
      })
    );
  });

  it("should disconnect on unmount", () => {
    const callback = vi.fn();
    const { unmount } = renderHook(() => useInfiniteScroll(callback));
    unmount();
    expect(mockDisconnect).toHaveBeenCalled();
  });
});
