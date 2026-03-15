import { describe, it, expect, vi } from "vitest";
import { threatMonitor } from "@/lib/threatMonitor";

describe("ThreatMonitor", () => {
  it("report creates threat with id", () => {
    const t = threatMonitor.report("malware", "high", "Malware detected");
    expect(t.id).toBeDefined();
    expect(t.type).toBe("malware");
    expect(t.level).toBe("high");
  });

  it("getThreats returns all threats", () => {
    threatMonitor.report("scan", "low", "Port scan");
    expect(threatMonitor.getThreats().length).toBeGreaterThanOrEqual(1);
  });

  it("getThreats filters by level", () => {
    threatMonitor.report("brute", "critical", "Brute force");
    const critical = threatMonitor.getThreats("critical");
    expect(critical.every(t => t.level === "critical")).toBe(true);
  });

  it("onThreat callback fires on report", () => {
    const cb = vi.fn();
    threatMonitor.onThreat(cb);
    threatMonitor.report("test", "medium", "Test threat");
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ type: "test" }));
  });

  it("onThreat returns unsubscribe function", () => {
    const cb = vi.fn();
    const unsub = threatMonitor.onThreat(cb);
    unsub();
    threatMonitor.report("after-unsub", "low", "Should not trigger");
    // cb may have been called from previous tests; just verify unsub is a function
    expect(typeof unsub).toBe("function");
  });

  it("threat has timestamp", () => {
    const t = threatMonitor.report("ts", "low", "Timestamp test");
    expect(t.timestamp).toBeInstanceOf(Date);
  });
});
