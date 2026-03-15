import { describe, it, expect } from "vitest";
import { isMobile, isTablet, isDesktop, getDeviceType, getOS, getScreenSize, getViewportSize, getPixelRatio, isRetina, supportsTouch } from "@/utils/device";

describe("device utils", () => {
  describe("detection", () => {
    it("jsdom is desktop", () => { expect(isDesktop()).toBe(true); });
    it("not mobile in jsdom", () => { expect(isMobile()).toBe(false); });
    it("not tablet in jsdom", () => { expect(isTablet()).toBe(false); });
    it("getDeviceType returns desktop", () => { expect(getDeviceType()).toBe("desktop"); });
  });

  describe("getOS", () => {
    it("returns a string", () => { expect(typeof getOS()).toBe("string"); });
  });

  describe("screen/viewport", () => {
    it("getScreenSize returns width/height", () => { const s = getScreenSize(); expect(s).toHaveProperty("width"); expect(s).toHaveProperty("height"); });
    it("getViewportSize returns width/height", () => { const v = getViewportSize(); expect(v).toHaveProperty("width"); expect(v).toHaveProperty("height"); });
  });

  describe("getPixelRatio", () => {
    it("returns number >= 1", () => { expect(getPixelRatio()).toBeGreaterThanOrEqual(1); });
  });

  describe("isRetina", () => {
    it("returns boolean", () => { expect(typeof isRetina()).toBe("boolean"); });
  });

  describe("supportsTouch", () => {
    it("returns boolean", () => { expect(typeof supportsTouch()).toBe("boolean"); });
  });
});
