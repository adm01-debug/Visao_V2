import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { FocusTrap } from "../FocusTrap";

describe("FocusTrap", () => {
  it("should render children", () => {
    render(
      <FocusTrap>
        <button>Test Button</button>
      </FocusTrap>
    );
    expect(screen.getByText("Test Button")).toBeTruthy();
  });

  it("should call onEscape when Escape is pressed", () => {
    const onEscape = vi.fn();
    render(
      <FocusTrap active onEscape={onEscape}>
        <button>Test</button>
      </FocusTrap>
    );
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onEscape).toHaveBeenCalled();
  });

  it("should not trap focus when inactive", () => {
    render(
      <FocusTrap active={false}>
        <button>Test</button>
      </FocusTrap>
    );
    expect(screen.getByText("Test")).toBeTruthy();
  });
});
