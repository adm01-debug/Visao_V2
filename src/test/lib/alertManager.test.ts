import { describe, it, expect, vi } from "vitest";
import { alertManager } from "@/lib/alertManager";

describe("AlertManager", () => {
  it("fires an alert and returns it", () => {
    const alert = alertManager.fire("info", "Test", "Description");
    expect(alert.id).toBeDefined();
    expect(alert.severity).toBe("info");
    expect(alert.title).toBe("Test");
    expect(alert.acknowledged).toBe(false);
  });

  it("getActive returns unacknowledged alerts", () => {
    const a = alertManager.fire("warning", "W", "warning test");
    expect(alertManager.getActive().some(x => x.id === a.id)).toBe(true);
  });

  it("acknowledge marks alert", () => {
    const a = alertManager.fire("critical", "C", "critical test");
    alertManager.acknowledge(a.id);
    expect(alertManager.getActive().find(x => x.id === a.id)).toBeUndefined();
  });

  it("acknowledge non-existent id is safe", () => {
    expect(() => alertManager.acknowledge("nonexistent")).not.toThrow();
  });

  it("onAlert handler is called on fire", () => {
    const handler = vi.fn();
    alertManager.onAlert(handler);
    alertManager.fire("info", "Handler Test", "desc");
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(expect.objectContaining({ title: "Handler Test" }));
  });

  it("multiple handlers are called", () => {
    const h1 = vi.fn();
    const h2 = vi.fn();
    alertManager.onAlert(h1);
    alertManager.onAlert(h2);
    alertManager.fire("info", "Multi", "desc");
    expect(h1).toHaveBeenCalled();
    expect(h2).toHaveBeenCalled();
  });
});
