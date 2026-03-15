import { describe, it, expect, afterEach } from "vitest";
import { getFocusedElement, focus, blur, isFocused, trapFocus } from "@/lib/focus";

describe("focus", () => {
  afterEach(() => { document.body.innerHTML = ""; });

  it("getFocusedElement returns body by default", () => {
    expect(getFocusedElement()).toBe(document.body);
  });

  it("focus sets active element", () => {
    const btn = document.createElement("button");
    document.body.appendChild(btn);
    focus(btn);
    expect(document.activeElement).toBe(btn);
  });

  it("blur removes focus", () => {
    const btn = document.createElement("button");
    document.body.appendChild(btn);
    focus(btn);
    blur(btn);
    expect(document.activeElement).not.toBe(btn);
  });

  it("isFocused returns correct state", () => {
    const btn = document.createElement("button");
    document.body.appendChild(btn);
    expect(isFocused(btn)).toBe(false);
    focus(btn);
    expect(isFocused(btn)).toBe(true);
  });

  it("trapFocus returns cleanup function", () => {
    const div = document.createElement("div");
    div.innerHTML = '<button>A</button><button>B</button>';
    document.body.appendChild(div);
    const cleanup = trapFocus(div);
    expect(typeof cleanup).toBe("function");
    cleanup();
  });
});
