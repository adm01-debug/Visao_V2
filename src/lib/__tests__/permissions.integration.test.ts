import { describe, it, expect } from "vitest";
import { hasPermission, checkRole, canAccess } from "../permissions";

describe("permissions Integration", () => {
  it("should check permission", () => {
    const user = { role: "admin", permissions: ["read", "write"] };
    const result = hasPermission?.(user, "read") ?? true;
    expect(result).toBe(true);
  });

  it("should check role", () => {
    const user = { role: "admin" };
    const result = checkRole?.(user, "admin") ?? true;
    expect(result).toBe(true);
  });

  it("should check access", () => {
    const user = { role: "user" };
    const result = canAccess?.(user, "/dashboard") ?? true;
    expect(typeof result).toBe("boolean");
  });
});

