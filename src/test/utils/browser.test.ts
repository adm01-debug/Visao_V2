import { describe, it, expect } from "vitest";
import { isBrowser, isServer, getBrowserInfo, isOnline, getLanguage } from "@/utils/browser";

describe("browser utils", () => {
  describe("isBrowser", () => {
    it("returns true in jsdom", () => { expect(isBrowser()).toBe(true); });
  });
  describe("isServer", () => {
    it("returns false in jsdom", () => { expect(isServer()).toBe(false); });
  });
  describe("getBrowserInfo", () => {
    it("returns object with name and version", () => {
      const info = getBrowserInfo();
      expect(info).toHaveProperty("name");
      expect(info).toHaveProperty("version");
    });
  });
  describe("isOnline", () => {
    it("returns boolean", () => { expect(typeof isOnline()).toBe("boolean"); });
  });
  describe("getLanguage", () => {
    it("returns a string", () => { expect(typeof getLanguage()).toBe("string"); expect(getLanguage().length).toBeGreaterThan(0); });
  });
});
