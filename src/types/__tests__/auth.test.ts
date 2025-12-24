import { describe, it, expectTypeOf } from "vitest";
import type { User, UserRole, Session, LoginCredentials, RegisterCredentials } from "../auth";

describe("Auth Types", () => {
  it("User should have required fields", () => {
    const user: User = { id: "1", email: "test@test.com", role: "admin", createdAt: "2024-01-01" };
    expectTypeOf(user.id).toBeString();
    expectTypeOf(user.email).toBeString();
    expectTypeOf(user.role).toEqualTypeOf<UserRole>();
  });

  it("UserRole should be union type", () => {
    const role: UserRole = "admin";
    expectTypeOf(role).toEqualTypeOf<"admin" | "operator" | "viewer">();
  });

  it("Session should have tokens", () => {
    const session: Session = {
      user: { id: "1", email: "test@test.com", role: "admin", createdAt: "2024-01-01" },
      accessToken: "token", refreshToken: "refresh", expiresAt: 123456
    };
    expectTypeOf(session.accessToken).toBeString();
  });

  it("LoginCredentials should have email and password", () => {
    const creds: LoginCredentials = { email: "test@test.com", password: "pass" };
    expectTypeOf(creds).toMatchTypeOf<{ email: string; password: string }>();
  });
});
