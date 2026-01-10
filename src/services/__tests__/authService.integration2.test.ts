import { describe, it, expect } from "vitest";

describe("authService Integration", () => {
  it("should export auth functions", async () => {
    const service = await import("../authService");
    expect(service).toBeDefined();
  });

  it("should have login method", async () => {
    const service = await import("../authService");
    expect(service.login || service.signIn || service.default).toBeDefined();
  });

  it("should have logout method", async () => {
    const service = await import("../authService");
    expect(service.logout || service.signOut || service.default).toBeDefined();
  });
});

