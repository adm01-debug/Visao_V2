import { describe, it, expect } from "vitest";
import { escapeHtml, generateNonce, hashString, isSecureContext } from "@/utils/security";

describe("security utils", () => {
  describe("escapeHtml", () => {
    it("escapes HTML special chars", () => {
      // Uses DOM createElement - may differ from string-based approach
      const result = escapeHtml("<script>alert('xss')</script>");
      expect(result).not.toContain("<script>");
    });
    it("preserves plain text", () => {
      expect(escapeHtml("hello world")).toBe("hello world");
    });
  });

  describe("generateNonce", () => {
    it("generates 32-char hex string", () => {
      const nonce = generateNonce();
      expect(nonce).toHaveLength(32);
      expect(/^[0-9a-f]+$/.test(nonce)).toBe(true);
    });
    it("generates unique nonces", () => {
      const nonces = new Set(Array.from({ length: 100 }, () => generateNonce()));
      expect(nonces.size).toBe(100);
    });
  });

  describe("hashString", () => {
    it("returns a hex hash", async () => {
      const hash = await hashString("test");
      expect(typeof hash).toBe("string");
      expect(hash.length).toBeGreaterThan(0);
      expect(/^[0-9a-f]+$/.test(hash)).toBe(true);
    });
    it("same input = same output", async () => {
      const h1 = await hashString("hello");
      const h2 = await hashString("hello");
      expect(h1).toBe(h2);
    });
    it("different input = different output", async () => {
      const h1 = await hashString("hello");
      const h2 = await hashString("world");
      expect(h1).not.toBe(h2);
    });
  });

  describe("isSecureContext", () => {
    it("returns boolean", () => {
      expect(typeof isSecureContext()).toBe("boolean");
    });
  });
});
