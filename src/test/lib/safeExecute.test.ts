import { describe, it, expect } from "vitest";
import safeExecute from "@/lib/safeExecute";

describe("lib/safeExecute", () => {
  it("returns value on success (sync)", async () => {
    expect(await safeExecute(() => 42)).toBe(42);
  });

  it("returns value on success (async)", async () => {
    expect(await safeExecute(async () => "hello")).toBe("hello");
  });

  it("returns fallback on error", async () => {
    expect(await safeExecute(() => { throw new Error("boom"); }, "fallback")).toBe("fallback");
  });

  it("returns undefined when no fallback", async () => {
    expect(await safeExecute(() => { throw new Error("boom"); })).toBeUndefined();
  });

  it("handles async errors", async () => {
    expect(await safeExecute(async () => { throw new Error("async boom"); }, 0)).toBe(0);
  });

  it("handles null/undefined returns", async () => {
    expect(await safeExecute(() => null)).toBeNull();
    expect(await safeExecute(() => undefined)).toBeUndefined();
  });
});
