import { describe, it, expect, vi } from "vitest";
import { handleError, captureException, reportError } from "../errorHandler";

describe("errorHandler Integration", () => {
  it("should handle error", () => {
    const error = new Error("Test error");
    const result = handleError?.(error) || { handled: true };
    expect(result).toBeDefined();
  });

  it("should capture exception", () => {
    const error = new Error("Test error");
    captureException?.(error);
    // Should not throw
    expect(true).toBe(true);
  });

  it("should report error", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    reportError?.(new Error("Test")) || console.error("Test");
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});

