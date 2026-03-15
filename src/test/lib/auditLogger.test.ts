import { describe, it, expect, beforeEach, vi } from "vitest";

let counter = 0;
vi.stubGlobal("crypto", {
  ...crypto,
  randomUUID: () => `audit-uuid-${++counter}`,
  getRandomValues: (arr: Uint8Array) => { for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256); return arr; },
});

import { auditLogger } from "@/lib/auditLogger";

describe("AuditLogger", () => {
  beforeEach(() => {
    auditLogger.clear();
    localStorage.clear();
  });

  it("log creates entry with id and timestamp", async () => {
    await auditLogger.log({ userId: "u1", action: "login", resource: "auth", success: true });
    const entries = auditLogger.getEntries();
    expect(entries).toHaveLength(1);
    expect(entries[0].id).toBeDefined();
    expect(entries[0].timestamp).toBeGreaterThan(0);
    expect(entries[0].action).toBe("login");
  });

  it("getEntries filters by userId", async () => {
    await auditLogger.log({ userId: "u1", action: "login", resource: "auth", success: true });
    await auditLogger.log({ userId: "u2", action: "logout", resource: "auth", success: true });
    expect(auditLogger.getEntries({ userId: "u1" })).toHaveLength(1);
  });

  it("getEntries filters by action", async () => {
    await auditLogger.log({ userId: "u1", action: "login", resource: "auth", success: true });
    await auditLogger.log({ userId: "u1", action: "create", resource: "cameras", success: true });
    expect(auditLogger.getEntries({ action: "create" })).toHaveLength(1);
  });

  it("getEntries filters by resource", async () => {
    await auditLogger.log({ userId: "u1", action: "read", resource: "cameras", success: true });
    await auditLogger.log({ userId: "u1", action: "read", resource: "alerts", success: true });
    expect(auditLogger.getEntries({ resource: "alerts" })).toHaveLength(1);
  });

  it("getRecentEntries returns newest first", async () => {
    await auditLogger.log({ userId: "u1", action: "login", resource: "a", success: true });
    await auditLogger.log({ userId: "u1", action: "logout", resource: "b", success: true });
    const recent = auditLogger.getRecentEntries(2);
    expect(recent[0].action).toBe("logout");
    expect(recent[1].action).toBe("login");
  });

  it("getFailedLogins filters correctly", async () => {
    await auditLogger.log({ userId: "u1", action: "login_failed", resource: "auth", success: false });
    await auditLogger.log({ userId: "u1", action: "login", resource: "auth", success: true });
    expect(auditLogger.getFailedLogins()).toHaveLength(1);
    expect(auditLogger.getFailedLogins("u1")).toHaveLength(1);
    expect(auditLogger.getFailedLogins("u2")).toHaveLength(0);
  });

  it("clear removes all entries", async () => {
    await auditLogger.log({ userId: "u1", action: "login", resource: "auth", success: true });
    auditLogger.clear();
    expect(auditLogger.getEntries()).toHaveLength(0);
  });

  it("export returns JSON string", async () => {
    await auditLogger.log({ userId: "u1", action: "login", resource: "auth", success: true });
    const json = auditLogger.export();
    expect(JSON.parse(json)).toHaveLength(1);
  });

  it("persists to localStorage", async () => {
    await auditLogger.log({ userId: "u1", action: "login", resource: "auth", success: true });
    expect(localStorage.getItem("visao_audit_log")).not.toBeNull();
  });

  it("setRemoteEndpoint does not throw", () => {
    expect(() => auditLogger.setRemoteEndpoint("https://example.com/audit")).not.toThrow();
  });
});
