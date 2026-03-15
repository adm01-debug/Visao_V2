import { describe, it, expect, beforeEach } from "vitest";
import { get, set, remove, getAll, has, clear } from "@/utils/cookie";

describe("cookie utils", () => {
  beforeEach(() => { document.cookie.split(";").forEach(c => { const n = c.trim().split("=")[0]; if (n) document.cookie = `${n}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`; }); });

  describe("set/get", () => {
    it("sets and gets a cookie", () => { set("test", "value"); expect(get("test")).toBe("value"); });
    it("encodes/decodes special chars", () => { set("k", "a=b&c"); expect(get("k")).toBe("a=b&c"); });
    it("returns null for missing", () => { expect(get("missing")).toBeNull(); });
    it("handles spaces in value", () => { set("k", "hello world"); expect(get("k")).toBe("hello world"); });
    it("overwrites existing", () => { set("k", "v1"); set("k", "v2"); expect(get("k")).toBe("v2"); });
  });

  describe("set with options", () => {
    it("sets with secure flag", () => { set("k", "v", 7, { secure: true }); });
    it("sets with sameSite", () => { set("k", "v", 7, { sameSite: "Lax" }); });
  });

  describe("remove", () => {
    it("removes a cookie", () => { set("k", "v"); remove("k"); expect(get("k")).toBeNull(); });
    it("is safe for non-existent", () => { remove("nope"); });
  });

  describe("has", () => {
    it("returns true for existing", () => { set("k", "v"); expect(has("k")).toBe(true); });
    it("returns false for missing", () => { expect(has("missing")).toBe(false); });
  });

  describe("getAll", () => {
    it("returns all cookies", () => { set("a", "1"); set("b", "2"); const all = getAll(); expect(all.a).toBe("1"); expect(all.b).toBe("2"); });
    it("returns object", () => { expect(typeof getAll()).toBe("object"); });
  });

  describe("clear", () => {
    it("removes all cookies", () => { set("a", "1"); set("b", "2"); clear(); expect(has("a")).toBe(false); expect(has("b")).toBe(false); });
  });
});
