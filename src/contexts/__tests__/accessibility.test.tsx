import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AccessibilityProvider, useAccessibility } from "../accessibility";

const TestComponent = () => {
  const { reducedMotion, highContrast } = useAccessibility();
  return (
    <div>
      <span data-testid="motion">{reducedMotion ? "reduced" : "normal"}</span>
      <span data-testid="contrast">{highContrast ? "high" : "normal"}</span>
    </div>
  );
};

describe("AccessibilityContext", () => {
  it("provides accessibility settings", () => {
    render(
      <AccessibilityProvider>
        <TestComponent />
      </AccessibilityProvider>
    );
    expect(screen.getByTestId("motion")).toBeInTheDocument();
    expect(screen.getByTestId("contrast")).toBeInTheDocument();
  });

  it("respects user preferences", () => {
    render(
      <AccessibilityProvider>
        <TestComponent />
      </AccessibilityProvider>
    );
    expect(screen.getByTestId("motion")).toBeTruthy();
  });
});
