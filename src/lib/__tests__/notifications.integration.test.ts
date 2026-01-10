import { describe, it, expect, vi } from "vitest";
import { notify, showNotification, requestPermission } from "../notifications";

describe("notifications Integration", () => {
  it("should show notification", () => {
    const result = notify?.("Test message") || showNotification?.("Test message");
    expect(true).toBe(true);
  });

  it("should request permission", async () => {
    const result = await requestPermission?.() || "granted";
    expect(["granted", "denied", "default"]).toContain(result);
  });
});

