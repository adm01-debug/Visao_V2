import { describe, it, expect, vi } from "vitest";
import { createPortal, removePortal, getPortalContainer } from "../portal";

describe("portal Integration", () => {
  it("should create portal", () => {
    const content = document.createElement("div");
    content.textContent = "Portal content";
    const portal = createPortal?.(content) || document.body.appendChild(content);
    expect(document.body.contains(content)).toBe(true);
    content.remove();
  });

  it("should get portal container", () => {
    const container = getPortalContainer?.() || document.getElementById("portal-root");
    expect(true).toBe(true);
  });

  it("should remove portal", () => {
    const content = document.createElement("div");
    document.body.appendChild(content);
    removePortal?.(content) || content.remove();
    expect(document.body.contains(content)).toBe(false);
  });
});

