import { describe, it, expect, beforeEach } from "vitest";
import { $, $$, addClass, removeClass, toggleClass, hasClass } from "@/utils/dom";

describe("dom utils", () => {
  beforeEach(() => { document.body.innerHTML = '<div id="root" class="main"><span class="item">A</span><span class="item">B</span></div>'; });

  describe("$", () => {
    it("selects element", () => { expect($(\"#root\")).not.toBeNull(); });
    it("returns null for missing", () => { expect($(\"#nope\")).toBeNull(); });
    it("selects by class", () => { expect($(".item")).not.toBeNull(); });
  });

  describe("$$", () => {
    it("returns array of elements", () => { expect($$(".item")).toHaveLength(2); });
    it("returns empty for no match", () => { expect($$(".nope")).toHaveLength(0); });
  });

  describe("class manipulation", () => {
    it("addClass adds class", () => {
      const el = $("#root")!;
      addClass(el, "new-class");
      expect(hasClass(el, "new-class")).toBe(true);
    });
    it("removeClass removes class", () => {
      const el = $("#root")!;
      removeClass(el, "main");
      expect(hasClass(el, "main")).toBe(false);
    });
    it("toggleClass toggles", () => {
      const el = $("#root")!;
      toggleClass(el, "toggled");
      expect(hasClass(el, "toggled")).toBe(true);
      toggleClass(el, "toggled");
      expect(hasClass(el, "toggled")).toBe(false);
    });
    it("hasClass checks correctly", () => {
      expect(hasClass($("#root")!, "main")).toBe(true);
      expect(hasClass($("#root")!, "nope")).toBe(false);
    });
    it("addClass multiple", () => {
      const el = $("#root")!;
      addClass(el, "a", "b", "c");
      expect(hasClass(el, "a")).toBe(true);
      expect(hasClass(el, "b")).toBe(true);
      expect(hasClass(el, "c")).toBe(true);
    });
  });
});
