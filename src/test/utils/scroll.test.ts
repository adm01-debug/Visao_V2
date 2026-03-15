import { describe, it, expect, vi } from "vitest";
import { getScrollPosition, isScrolledToTop, lockScroll, unlockScroll, onScroll } from "@/utils/scroll";

describe("scroll utils", () => {
  describe("getScrollPosition", () => {
    it("returns x and y", () => { const pos = getScrollPosition(); expect(pos).toHaveProperty("x"); expect(pos).toHaveProperty("y"); expect(typeof pos.x).toBe("number"); });
  });

  describe("isScrolledToTop", () => {
    it("true at top", () => { expect(isScrolledToTop()).toBe(true); });
    it("true with threshold at top", () => { expect(isScrolledToTop(10)).toBe(true); });
  });

  describe("lockScroll / unlockScroll", () => {
    it("locks body overflow", () => { lockScroll(); expect(document.body.style.overflow).toBe("hidden"); });
    it("unlocks body overflow", () => { lockScroll(); unlockScroll(); expect(document.body.style.overflow).toBe(""); });
  });

  describe("onScroll", () => {
    it("registers and unregisters listener", () => {
      const spy = vi.spyOn(window, "addEventListener");
      const unsub = onScroll(() => {});
      expect(spy).toHaveBeenCalledWith("scroll", expect.any(Function));
      const removeSpy = vi.spyOn(window, "removeEventListener");
      unsub();
      expect(removeSpy).toHaveBeenCalledWith("scroll", expect.any(Function));
      spy.mockRestore();
      removeSpy.mockRestore();
    });
  });
});
