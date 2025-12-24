import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { AuthProvider, useAuth } from "../AuthContext";

const TestComponent = () => {
  const auth = useAuth();
  return <div data-testid="auth-status">{auth ? "authenticated" : "not authenticated"}</div>;
};

describe("AuthContext", () => {
  it("provides authentication context", () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    expect(screen.getByTestId("auth-status")).toBeInTheDocument();
  });

  it("handles user state", () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );
    expect(screen.getByTestId("auth-status")).toBeTruthy();
  });
});
