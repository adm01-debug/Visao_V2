import { describe, it, expect } from "vitest";
import { HealthChecker } from "@/lib/healthCheck";

describe("HealthChecker", () => {
  it("healthy when all checks pass", async () => {
    const hc = new HealthChecker();
    hc.register("db", async () => true);
    hc.register("cache", async () => true);
    const status = await hc.getStatus();
    expect(status.status).toBe("healthy");
    expect(status.checks).toHaveLength(2);
    expect(status.checks.every(c => c.status === "ok")).toBe(true);
  });

  it("degraded when some checks fail", async () => {
    const hc = new HealthChecker();
    hc.register("db", async () => true);
    hc.register("cache", async () => false);
    const status = await hc.getStatus();
    expect(status.status).toBe("degraded");
  });

  it("unhealthy when all checks fail", async () => {
    const hc = new HealthChecker();
    hc.register("db", async () => false);
    hc.register("cache", async () => false);
    const status = await hc.getStatus();
    expect(status.status).toBe("unhealthy");
  });

  it("handles check that throws", async () => {
    const hc = new HealthChecker();
    hc.register("flaky", async () => { throw new Error("boom"); });
    const status = await hc.getStatus();
    expect(status.status).toBe("unhealthy");
    expect(status.checks[0].status).toBe("failed");
  });

  it("includes duration for each check", async () => {
    const hc = new HealthChecker();
    hc.register("fast", async () => true);
    const status = await hc.getStatus();
    expect(status.checks[0].duration).toBeGreaterThanOrEqual(0);
  });

  it("empty checks = healthy", async () => {
    const hc = new HealthChecker();
    const status = await hc.getStatus();
    expect(status.status).toBe("healthy");
  });

  it("timestamp is set", async () => {
    const hc = new HealthChecker();
    const status = await hc.getStatus();
    expect(status.timestamp).toBeInstanceOf(Date);
  });
});
