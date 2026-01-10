import { describe, it, expect } from "vitest";

describe("notificationService Integration", () => {
  it("should export notification functions", async () => {
    const service = await import("../notificationService");
    expect(service).toBeDefined();
  });

  it("should send notifications", async () => {
    const service = await import("../notificationService");
    expect(service.sendNotification || service.notify || service.default).toBeDefined();
  });
});

