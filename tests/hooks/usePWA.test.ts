import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePWA } from "../usePWA";

describe("usePWA", () => {
  beforeEach(() => {
    vi.stubGlobal("navigator", { onLine: true });
  });

  it("should initialize with correct defaults", () => {
    const { result } = renderHook(() => usePWA());
    expect(result.current.canInstall).toBe(false);
    expect(result.current.isInstalled).toBe(false);
    expect(result.current.isOnline).toBe(true);
  });

  it("should track online status", async () => {
    const { result } = renderHook(() => usePWA());
    expect(result.current.isOnline).toBe(true);
  });

  it("should have install function", () => {
    const { result } = renderHook(() => usePWA());
    expect(typeof result.current.install).toBe("function");
  });
});
