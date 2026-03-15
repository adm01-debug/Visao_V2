import { describe, it, expect, vi, beforeEach } from "vitest";
import { createAuditEntry, type AuditAction, type AuditResource } from "@/lib/auditTrail";

describe("auditTrail", () => {
  beforeEach(() => {
    vi.stubGlobal("crypto", {
      ...crypto,
      randomUUID: () => "audit-uuid-test",
      getRandomValues: (arr: Uint8Array) => { for (let i = 0; i < arr.length; i++) arr[i] = Math.floor(Math.random() * 256); return arr; },
    });
  });

  describe("createAuditEntry", () => {
    it("creates entry with required fields", () => {
      const entry = createAuditEntry("user1", "Admin", "create", "camera");
      expect(entry.userId).toBe("user1");
      expect(entry.userName).toBe("Admin");
      expect(entry.action).toBe("create");
      expect(entry.resource).toBe("camera");
      expect(entry.id).toBeDefined();
      expect(entry.timestamp).toBeInstanceOf(Date);
    });

    it("includes optional fields", () => {
      const entry = createAuditEntry("u1", "User", "update", "alert", {
        resourceId: "alert-123",
        changes: {
          before: { status: "active" },
          after: { status: "resolved" },
          fields: ["status"],
        },
      });
      expect(entry.resourceId).toBe("alert-123");
      expect(entry.changes!.fields).toContain("status");
    });

    it("includes metadata", () => {
      const entry = createAuditEntry("u1", "User", "delete", "zone", {
        metadata: { source: "web", sessionId: "sess-1" },
      });
      expect(entry.metadata!.source).toBe("web");
    });

    const actions: AuditAction[] = ["create", "read", "update", "delete", "login", "logout", "export", "import", "config_change"];
    actions.forEach(action => {
      it(`accepts action: ${action}`, () => {
        const entry = createAuditEntry("u", "N", action, "camera");
        expect(entry.action).toBe(action);
      });
    });

    const resources: AuditResource[] = ["camera", "alert", "person", "zone", "recording", "rule", "user", "settings"];
    resources.forEach(resource => {
      it(`accepts resource: ${resource}`, () => {
        const entry = createAuditEntry("u", "N", "read", resource);
        expect(entry.resource).toBe(resource);
      });
    });
  });
});
