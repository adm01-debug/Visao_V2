import { describe, it, expect, beforeEach } from "vitest";
import { slaMonitor, type SLA } from "@/lib/sla";

describe("SLAMonitor", () => {
  // Use a fresh instance approach since slaMonitor is a singleton
  // We'll test the exported singleton but clear state

  it("define adds SLA", () => {
    slaMonitor.define("uptime-test", 99.9, "percent");
    const all = slaMonitor.getAll();
    const found = all.find(s => s.name === "uptime-test");
    expect(found).toBeDefined();
    expect(found!.target).toBe(99.9);
  });

  it("update changes current value", () => {
    slaMonitor.define("latency-test", 200, "ms");
    slaMonitor.update("latency-test", 150);
    const found = slaMonitor.getAll().find(s => s.name === "latency-test");
    expect(found!.current).toBe(150);
  });

  it("getViolations detects percent violations (current < target)", () => {
    slaMonitor.define("uptime-v", 99.9, "percent");
    slaMonitor.update("uptime-v", 98.0);
    const violations = slaMonitor.getViolations();
    expect(violations.some(v => v.name === "uptime-v")).toBe(true);
  });

  it("getViolations detects ms violations (current > target)", () => {
    slaMonitor.define("latency-v", 200, "ms");
    slaMonitor.update("latency-v", 350);
    const violations = slaMonitor.getViolations();
    expect(violations.some(v => v.name === "latency-v")).toBe(true);
  });

  it("no violation when within target", () => {
    slaMonitor.define("good-sla", 99.0, "percent");
    slaMonitor.update("good-sla", 99.5);
    const violations = slaMonitor.getViolations();
    expect(violations.some(v => v.name === "good-sla")).toBe(false);
  });

  it("update non-existent SLA is safe", () => {
    expect(() => slaMonitor.update("nonexistent", 100)).not.toThrow();
  });
});
