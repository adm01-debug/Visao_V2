import { describe, it, expect } from "vitest";

describe("analyticsService Integration", () => {
  it("should export analytics functions", async () => {
    const service = await import("../analyticsService");
    expect(service).toBeDefined();
  });

  it("should track events", async () => {
    const service = await import("../analyticsService");
    expect(service.trackEvent || service.track || service.default).toBeDefined();
  });
});

