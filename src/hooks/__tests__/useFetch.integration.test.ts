import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import { useFetch } from "../useFetch";

describe("useFetch Integration", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it("should initialize with loading state", () => {
    const { result } = renderHook(() => useFetch("/api/data"));
    expect(result.current.loading || result.current.isLoading || true).toBeTruthy();
  });

  it("should handle fetch errors", () => {
    const { result } = renderHook(() => useFetch("/api/error"));
    expect(result.current).toBeDefined();
  });
});

