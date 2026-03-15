import { describe, it, expect, beforeEach } from "vitest";
import { permissionService } from "@/services/permissionService";

describe("permissionService", () => {
  describe("admin role", () => {
    beforeEach(() => permissionService.setRole("admin"));

    it("can do everything", () => {
      expect(permissionService.can("create", "cameras")).toBe(true);
      expect(permissionService.can("delete", "users")).toBe(true);
      expect(permissionService.can("export", "reports")).toBe(true);
    });

    it("getPermissions returns full access", () => {
      const perms = permissionService.getPermissions();
      expect(perms.cameras).toContain("delete");
    });
  });

  describe("viewer role", () => {
    beforeEach(() => permissionService.setRole("viewer"));

    it("can only read most resources", () => {
      expect(permissionService.can("read", "cameras")).toBe(true);
      expect(permissionService.can("create", "cameras")).toBe(false);
      expect(permissionService.can("delete", "cameras")).toBe(false);
    });

    it("cannot access users or settings", () => {
      expect(permissionService.can("read", "users")).toBe(false);
      expect(permissionService.can("read", "settings")).toBe(false);
    });
  });

  describe("operator role", () => {
    beforeEach(() => permissionService.setRole("operator"));

    it("can read and update cameras", () => {
      expect(permissionService.can("read", "cameras")).toBe(true);
      expect(permissionService.can("update", "cameras")).toBe(true);
      expect(permissionService.can("delete", "cameras")).toBe(false);
    });

    it("cannot access users", () => {
      expect(permissionService.can("read", "users")).toBe(false);
    });
  });

  describe("manager role", () => {
    beforeEach(() => permissionService.setRole("manager"));

    it("can create cameras but not delete", () => {
      expect(permissionService.can("create", "cameras")).toBe(true);
      expect(permissionService.can("delete", "cameras")).toBe(false);
    });

    it("can read users but not create", () => {
      expect(permissionService.can("read", "users")).toBe(true);
      expect(permissionService.can("create", "users")).toBe(false);
    });
  });

  describe("canAny", () => {
    it("true if any action is permitted", () => {
      permissionService.setRole("viewer");
      expect(permissionService.canAny(["read", "delete"], "cameras")).toBe(true);
    });

    it("false if none are permitted", () => {
      permissionService.setRole("viewer");
      expect(permissionService.canAny(["create", "delete"], "cameras")).toBe(false);
    });
  });

  describe("canAll", () => {
    it("true only if all actions permitted", () => {
      permissionService.setRole("admin");
      expect(permissionService.canAll(["create", "read", "delete"], "cameras")).toBe(true);
    });

    it("false if any action missing", () => {
      permissionService.setRole("operator");
      expect(permissionService.canAll(["read", "delete"], "cameras")).toBe(false);
    });
  });

  describe("getRole", () => {
    it("returns current role", () => {
      permissionService.setRole("manager");
      expect(permissionService.getRole()).toBe("manager");
    });
  });

  // SECURITY GAP: role stored in client-side memory, easily manipulated
  it("SECURITY GAP: setRole has no server-side validation", () => {
    permissionService.setRole("viewer");
    permissionService.setRole("admin"); // Can be called by anyone
    expect(permissionService.can("delete", "users")).toBe(true);
    // In production, role should be validated server-side
  });
});
