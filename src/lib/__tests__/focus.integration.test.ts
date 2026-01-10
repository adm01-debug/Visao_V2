import { describe, it, expect, vi } from "vitest";
import { focusTrap, focusFirst, focusLast, restoreFocus } from "../focus";

describe("focus Integration", () => {
  it("should focus first element", () => {
    const container = document.createElement("div");
    const input = document.createElement("input");
    container.appendChild(input);
    document.body.appendChild(container);

    input.focus = vi.fn();
    focusFirst?.(container);
    expect(input.focus).toHaveBeenCalled();

    document.body.removeChild(container);
  });

  it("should restore focus", () => {
    const element = document.createElement("button");
    element.focus = vi.fn();

    restoreFocus?.(element);
    expect(element.focus).toHaveBeenCalled();
  });
});

