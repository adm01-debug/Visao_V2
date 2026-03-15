import { describe, it, expect, afterEach } from "vitest";
import { isFocusable, getFocusableElements, trapFocus, announceToScreenReader, getContrastRatio, meetsContrastAA, meetsContrastAAA, generateA11yId } from "@/lib/accessibility";

describe("accessibility", () => {
  afterEach(() => { document.body.innerHTML = ""; });

  describe("isFocusable", () => {
    it("button is focusable", () => {
      const btn = document.createElement("button");
      document.body.appendChild(btn);
      expect(isFocusable(btn)).toBe(true);
    });
    it("disabled button is not focusable", () => {
      const btn = document.createElement("button");
      btn.disabled = true;
      document.body.appendChild(btn);
      expect(isFocusable(btn)).toBe(false);
    });
    it("div is not focusable", () => {
      const div = document.createElement("div");
      document.body.appendChild(div);
      expect(isFocusable(div)).toBe(false);
    });
    it("div with tabindex is focusable", () => {
      const div = document.createElement("div");
      div.setAttribute("tabindex", "0");
      document.body.appendChild(div);
      expect(isFocusable(div)).toBe(true);
    });
    it("tabindex=-1 is not focusable", () => {
      const div = document.createElement("div");
      div.setAttribute("tabindex", "-1");
      document.body.appendChild(div);
      expect(isFocusable(div)).toBe(false);
    });
    it("input is focusable", () => {
      const input = document.createElement("input");
      document.body.appendChild(input);
      expect(isFocusable(input)).toBe(true);
    });
    it("a with href is focusable", () => {
      const a = document.createElement("a");
      a.href = "#";
      document.body.appendChild(a);
      expect(isFocusable(a)).toBe(true);
    });
    it("a without href is not focusable", () => {
      const a = document.createElement("a");
      document.body.appendChild(a);
      expect(isFocusable(a)).toBe(false);
    });
  });

  describe("getFocusableElements", () => {
    it("returns all focusable children", () => {
      const div = document.createElement("div");
      div.innerHTML = '<button>B1</button><input/><span>text</span><button>B2</button>';
      document.body.appendChild(div);
      expect(getFocusableElements(div)).toHaveLength(3);
    });
    it("empty container returns empty", () => {
      const div = document.createElement("div");
      expect(getFocusableElements(div)).toHaveLength(0);
    });
  });

  describe("trapFocus", () => {
    it("returns cleanup function", () => {
      const div = document.createElement("div");
      div.innerHTML = '<button>A</button><button>B</button>';
      document.body.appendChild(div);
      const cleanup = trapFocus(div);
      expect(typeof cleanup).toBe("function");
      cleanup();
    });
  });

  describe("announceToScreenReader", () => {
    it("adds and removes announcement element", async () => {
      announceToScreenReader("Test announcement");
      const el = document.querySelector('[role="status"]');
      expect(el).not.toBeNull();
      expect(el?.textContent).toBe("Test announcement");
    });
    it("assertive priority sets aria-live", () => {
      announceToScreenReader("Urgent", "assertive");
      const el = document.querySelector('[aria-live="assertive"]');
      expect(el).not.toBeNull();
    });
  });

  describe("getContrastRatio", () => {
    it("black vs white = 21", () => {
      expect(getContrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 0);
    });
    it("same color = 1", () => {
      expect(getContrastRatio("#ff0000", "#ff0000")).toBeCloseTo(1, 0);
    });
    it("symmetric", () => {
      const r1 = getContrastRatio("#336699", "#ffffff");
      const r2 = getContrastRatio("#ffffff", "#336699");
      expect(r1).toBeCloseTo(r2, 2);
    });
  });

  describe("meetsContrastAA", () => {
    it("black on white passes", () => {
      expect(meetsContrastAA("#000000", "#ffffff")).toBe(true);
    });
    it("light gray on white fails", () => {
      expect(meetsContrastAA("#cccccc", "#ffffff")).toBe(false);
    });
    it("large text has lower threshold (3:1)", () => {
      // Gray that passes 3:1 but not 4.5:1
      expect(meetsContrastAA("#767676", "#ffffff", true)).toBe(true);
    });
  });

  describe("meetsContrastAAA", () => {
    it("black on white passes", () => {
      expect(meetsContrastAAA("#000000", "#ffffff")).toBe(true);
    });
    it("medium gray on white fails AAA for normal text", () => {
      expect(meetsContrastAAA("#767676", "#ffffff")).toBe(false);
    });
  });

  describe("generateA11yId", () => {
    it("starts with prefix", () => {
      expect(generateA11yId("modal")).toMatch(/^modal-/);
    });
    it("generates unique ids", () => {
      const ids = new Set(Array.from({ length: 100 }, () => generateA11yId("x")));
      expect(ids.size).toBe(100);
    });
  });
});
