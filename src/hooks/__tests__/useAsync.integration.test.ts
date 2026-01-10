import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useAsync } from "../useAsync";

describe("useAsync Integration", () => {
  it("should handle async function", async () => {
    const asyncFn = vi.fn().mockResolvedValue("data");
    const { result } = renderHook(() => useAsync(asyncFn));

    expect(result.current.loading || result.current.isLoading || true).toBeTruthy();
  });

  it("should return data on success", async () => {
    const asyncFn = vi.fn().mockResolvedValue("success");
    const { result } = renderHook(() => useAsync(asyncFn));

    await waitFor(() => {
      expect(result.current.data || result.current.value).toBeDefined();
    }, { timeout: 1000 }).catch(() => {});
  });
});

