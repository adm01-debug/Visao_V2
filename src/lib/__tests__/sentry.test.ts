import { describe, it, expect, vi } from "vitest";
import { initSentry, captureError, captureMessage } from "../sentry";

describe("Sentry", () => {
  it("initializes without errors", () => {
    expect(() => initSentry()).not.toThrow();
  });

  it("captures errors", () => {
    const error = new Error("Test error");
    expect(() => captureError(error)).not.toThrow();
  });

  it("captures messages", () => {
    expect(() => captureMessage("Test message")).not.toThrow();
  });

  it("handles undefined errors gracefully", () => {
    expect(() => captureError(undefined as any)).not.toThrow();
  });
});
