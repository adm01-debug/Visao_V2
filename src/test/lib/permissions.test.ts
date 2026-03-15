import { describe, it, expect } from "vitest";
import { hasPermission, canRead, canWrite, canDelete, isAdmin, type PermissionSet } from "@/lib/permissions";

describe("permissions", () => {
  const userPerms: PermissionSet = {
    cameras: ["read", "write"],
    alerts: ["read"],
  };
  const adminPerms: PermissionSet = { "*": ["admin"] };
  const emptyPerms: PermissionSet = {};

  describe("hasPermission", () => {
    it("true when permission exists", () => { expect(hasPermission(userPerms, "cameras", "read")).toBe(true); });
    it("false when permission missing", () => { expect(hasPermission(userPerms, "cameras", "delete")).toBe(false); });
    it("false for unknown resource", () => { expect(hasPermission(userPerms, "zones", "read")).toBe(false); });
    it("admin wildcard grants all", () => { expect(hasPermission(adminPerms, "anything", "delete")).toBe(true); });
    it("empty perms deny all", () => { expect(hasPermission(emptyPerms, "cameras", "read")).toBe(false); });
  });

  describe("canRead", () => {
    it("true for readable resource", () => { expect(canRead(userPerms, "cameras")).toBe(true); });
    it("false for non-readable", () => { expect(canRead(userPerms, "zones")).toBe(false); });
  });

  describe("canWrite", () => {
    it("true for writable resource", () => { expect(canWrite(userPerms, "cameras")).toBe(true); });
    it("false for read-only resource", () => { expect(canWrite(userPerms, "alerts")).toBe(false); });
  });

  describe("canDelete", () => {
    it("false when not granted", () => { expect(canDelete(userPerms, "cameras")).toBe(false); });
    it("true via admin wildcard", () => { expect(canDelete(adminPerms, "cameras")).toBe(true); });
  });

  describe("isAdmin", () => {
    it("true for admin perms", () => { expect(isAdmin(adminPerms)).toBe(true); });
    it("false for regular perms", () => { expect(isAdmin(userPerms)).toBe(false); });
    it("false for empty", () => { expect(isAdmin(emptyPerms)).toBe(false); });
  });
});
