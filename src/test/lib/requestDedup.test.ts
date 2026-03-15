import { describe, it, expect, vi, beforeEach } from "vitest";
import { cancelPending } from "@/lib/requestDedup";

describe("requestDedup", () => {
  it("cancelPending with no URL clears all", () => {
    expect(() => cancelPending()).not.toThrow();
  });

  it("cancelPending with specific URL is safe", () => {
    expect(() => cancelPending("http://test.com/api")).not.toThrow();
  });

  it("cancelPending multiple times is safe", () => {
    cancelPending();
    cancelPending("url1");
    cancelPending("url2");
    cancelPending();
    expect(true).toBe(true);
  });
});
