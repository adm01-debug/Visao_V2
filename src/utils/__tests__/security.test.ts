import { describe, it, expect } from "vitest";
import { escapeHtml, generateNonce } from "../security";

describe("security utils", () => {
  describe("escapeHtml", () => {
    it("escapes HTML entities", () => {
      expect(escapeHtml("<script>")).toContain("&lt;");
      expect(escapeHtml("&")).toContain("&amp;");
    });
  });

  describe("generateNonce", () => {
    it("generates unique nonces", () => {
      const nonce1 = generateNonce();
      const nonce2 = generateNonce();
      expect(nonce1).not.toBe(nonce2);
      expect(nonce1.length).toBe(32);
    });
  });
});
