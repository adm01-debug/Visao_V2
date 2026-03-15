import { describe, it, expect, beforeEach } from "vitest";
import { costMonitor } from "@/lib/costMonitor";

describe("CostMonitor", () => {
  it("record adds entry", () => {
    costMonitor.record("api", 10.5);
    expect(costMonitor.getByService("api").length).toBeGreaterThanOrEqual(1);
  });

  it("getByService filters correctly", () => {
    costMonitor.record("storage", 5);
    costMonitor.record("compute", 20);
    const storage = costMonitor.getByService("storage");
    expect(storage.every(c => c.service === "storage")).toBe(true);
  });

  it("getTotal sums all", () => {
    const total = costMonitor.getTotal();
    expect(total).toBeGreaterThan(0);
  });

  it("getTotal with period filter", () => {
    const period = new Date().toISOString().slice(0, 7);
    const total = costMonitor.getTotal(period);
    expect(total).toBeGreaterThanOrEqual(0);
  });

  it("getTotal with non-matching period returns 0", () => {
    expect(costMonitor.getTotal("1999-01")).toBe(0);
  });

  it("default currency is USD", () => {
    costMonitor.record("test-svc", 1);
    const entries = costMonitor.getByService("test-svc");
    expect(entries[0].currency).toBe("USD");
  });

  it("custom currency", () => {
    costMonitor.record("brl-svc", 100, "BRL");
    const entries = costMonitor.getByService("brl-svc");
    expect(entries[0].currency).toBe("BRL");
  });
});
