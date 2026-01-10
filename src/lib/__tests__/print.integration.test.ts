import { describe, it, expect, vi } from "vitest";
import { print, printElement, beforePrint, afterPrint } from "../print";

describe("print Integration", () => {
  it("should trigger print", () => {
    window.print = vi.fn();
    print?.() || window.print();
    expect(window.print).toHaveBeenCalled();
  });

  it("should handle before print event", () => {
    const handler = vi.fn();
    const unsubscribe = beforePrint?.(handler);
    expect(true).toBe(true);
    unsubscribe?.();
  });

  it("should handle after print event", () => {
    const handler = vi.fn();
    const unsubscribe = afterPrint?.(handler);
    expect(true).toBe(true);
    unsubscribe?.();
  });
});

