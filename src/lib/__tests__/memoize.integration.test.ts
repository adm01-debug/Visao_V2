import { describe, it, expect, vi } from "vitest";
import { memoize, memoizeAsync, clearMemoCache } from "../memoize";

describe("memoize Integration", () => {
  it("should memoize function results", () => {
    const fn = vi.fn((x: number) => x * 2);
    const memoized = memoize?.(fn) || fn;

    memoized(5);
    memoized(5);
    memoized(5);

    expect(fn).toHaveBeenCalledTimes(1);
  });

  it("should memoize async function", async () => {
    const fn = vi.fn(async (x: number) => x * 2);
    const memoized = memoizeAsync?.(fn) || fn;

    await memoized(5);
    await memoized(5);

    expect(fn).toHaveBeenCalledTimes(1);
  });
});

