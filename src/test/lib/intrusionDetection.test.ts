import { describe, it, expect, beforeEach } from "vitest";
import { intrusionDetector } from "@/lib/intrusionDetection";

describe("IntrusionDetector", () => {
  beforeEach(() => {
    intrusionDetector.clearEvents();
  });

  it("logEvent adds event", () => {
    intrusionDetector.logEvent("failed_login", { ip: "1.2.3.4" });
    expect(intrusionDetector.getRecentEvents(1)).toHaveLength(1);
  });

  it("getRecentEvents respects time window", () => {
    intrusionDetector.logEvent("failed_login", { ip: "1.2.3.4" });
    expect(intrusionDetector.getRecentEvents(0)).toHaveLength(0);
    expect(intrusionDetector.getRecentEvents(5)).toHaveLength(1);
  });

  it("clearEvents empties all", () => {
    intrusionDetector.logEvent("failed_login", {});
    intrusionDetector.logEvent("unauthorized_access", {});
    intrusionDetector.clearEvents();
    expect(intrusionDetector.getRecentEvents(60)).toHaveLength(0);
  });

  it("setThresholds does not throw", () => {
    expect(() => intrusionDetector.setThresholds({ failedLogins: 10 })).not.toThrow();
  });

  it("multiple failed logins triggers analysis without error", () => {
    for (let i = 0; i < 10; i++) {
      expect(() => intrusionDetector.logEvent("failed_login", { ip: "10.0.0.1" })).not.toThrow();
    }
    expect(intrusionDetector.getRecentEvents(1).length).toBe(10);
  });

  it("handles various event types", () => {
    const types = ["failed_login", "invalid_token", "unauthorized_access", "rapid_requests", "suspicious_pattern"];
    types.forEach(type => {
      intrusionDetector.logEvent(type as any, { reason: "test" });
    });
    expect(intrusionDetector.getRecentEvents(1)).toHaveLength(types.length);
  });

  it("event has timestamp", () => {
    intrusionDetector.logEvent("session_hijack", {});
    const events = intrusionDetector.getRecentEvents(1);
    expect(events[0].timestamp).toBeInstanceOf(Date);
  });
});
