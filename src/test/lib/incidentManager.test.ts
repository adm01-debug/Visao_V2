import { describe, it, expect, vi } from "vitest";

let counter = 0;
vi.stubGlobal("crypto", {
  ...crypto,
  randomUUID: () => `inc-uuid-${++counter}`,
  getRandomValues: (arr: Uint8Array) => { for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256); return arr; },
});

import { incidentManager } from "@/lib/incidentManager";

describe("IncidentManager", () => {
  it("create returns incident with open status", () => {
    const inc = incidentManager.create("Server down", "critical");
    expect(inc.status).toBe("open");
    expect(inc.severity).toBe("critical");
    expect(inc.updates).toHaveLength(0);
  });

  it("update changes status to investigating", () => {
    const inc = incidentManager.create("Slow response", "medium");
    incidentManager.update(inc.id, "Looking into it");
    expect(inc.status).toBe("investigating");
    expect(inc.updates).toHaveLength(1);
    expect(inc.updates[0].message).toBe("Looking into it");
  });

  it("resolve changes status and sets resolvedAt", () => {
    const inc = incidentManager.create("Issue", "low");
    incidentManager.resolve(inc.id);
    expect(inc.status).toBe("resolved");
    expect(inc.resolvedAt).toBeInstanceOf(Date);
  });

  it("getOpen excludes resolved", () => {
    const inc = incidentManager.create("Open one", "high");
    const inc2 = incidentManager.create("Resolved one", "low");
    incidentManager.resolve(inc2.id);
    const open = incidentManager.getOpen();
    expect(open.some(i => i.id === inc.id)).toBe(true);
    expect(open.some(i => i.id === inc2.id)).toBe(false);
  });

  it("update non-existent id is safe", () => {
    expect(() => incidentManager.update("fake", "msg")).not.toThrow();
  });

  it("resolve non-existent id is safe", () => {
    expect(() => incidentManager.resolve("fake")).not.toThrow();
  });

  it("multiple updates accumulate", () => {
    const inc = incidentManager.create("Multi", "medium");
    incidentManager.update(inc.id, "Update 1");
    incidentManager.update(inc.id, "Update 2");
    expect(inc.updates).toHaveLength(2);
  });
});
