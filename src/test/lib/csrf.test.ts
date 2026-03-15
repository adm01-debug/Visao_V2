import { describe, it, expect, beforeEach } from "vitest";
import { generateCSRFToken, getCSRFToken, validateCSRFToken, addCSRFHeader, initCSRF } from "@/lib/csrf";

describe("csrf", () => {
  beforeEach(() => { sessionStorage.clear(); });

  describe("generateCSRFToken", () => {
    it("generates 64 char hex token", () => { const t = generateCSRFToken(); expect(t).toHaveLength(64); expect(/^[0-9a-f]+$/.test(t)).toBe(true); });
    it("stores in sessionStorage", () => { generateCSRFToken(); expect(sessionStorage.getItem("csrf_token")).not.toBeNull(); });
    it("generates unique tokens", () => { const t1 = generateCSRFToken(); const t2 = generateCSRFToken(); expect(t1).not.toBe(t2); });
  });

  describe("getCSRFToken", () => {
    it("returns null when not set", () => { expect(getCSRFToken()).toBeNull(); });
    it("returns token after generation", () => { const t = generateCSRFToken(); expect(getCSRFToken()).toBe(t); });
  });

  describe("validateCSRFToken", () => {
    it("validates correct token", () => { const t = generateCSRFToken(); expect(validateCSRFToken(t)).toBe(true); });
    it("rejects wrong token", () => { generateCSRFToken(); expect(validateCSRFToken("wrong")).toBe(false); });
    it("rejects when no token stored", () => { expect(validateCSRFToken("anything")).toBe(false); });
  });

  describe("addCSRFHeader", () => {
    it("adds header when token exists", () => { generateCSRFToken(); const h = new Headers(); addCSRFHeader(h); expect(h.get("X-CSRF-Token")).not.toBeNull(); });
    it("no header when no token", () => { const h = new Headers(); addCSRFHeader(h); expect(h.get("X-CSRF-Token")).toBeNull(); });
  });

  describe("initCSRF", () => {
    it("creates token if none exists", () => { initCSRF(); expect(getCSRFToken()).not.toBeNull(); });
    it("keeps existing token", () => { const t = generateCSRFToken(); initCSRF(); expect(getCSRFToken()).toBe(t); });
  });
});
