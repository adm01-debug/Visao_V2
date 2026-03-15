import { describe, it, expect } from "vitest";
import { generateRandomString, generateToken, randomInt, hashSHA256, hashSHA512, hashMD5, base64Encode, base64Decode, arrayBufferToBase64, base64ToArrayBuffer, secureCompare } from "@/utils/crypto";

describe("crypto utils", () => {
  describe("generateRandomString", () => {
    it("generates correct length", () => { expect(generateRandomString(16)).toHaveLength(16); });
    it("generates unique", () => { const a = generateRandomString(32); const b = generateRandomString(32); expect(a).not.toBe(b); });
    it("only hex chars", () => { expect(/^[0-9a-f]+$/.test(generateRandomString(20))).toBe(true); });
    it("handles 0 length", () => { expect(generateRandomString(0)).toBe(""); });
    it("handles odd length", () => { expect(generateRandomString(7)).toHaveLength(7); });
  });

  describe("generateToken", () => {
    it("default 32 chars", () => { expect(generateToken()).toHaveLength(32); });
    it("custom length", () => { expect(generateToken(64)).toHaveLength(64); });
    it("unique tokens", () => { const tokens = new Set(Array.from({ length: 20 }, () => generateToken())); expect(tokens.size).toBe(20); });
  });

  describe("randomInt", () => {
    it("within range", () => { for (let i = 0; i < 50; i++) { const v = randomInt(5, 10); expect(v).toBeGreaterThanOrEqual(5); expect(v).toBeLessThan(10); } });
    it("negative range", () => { const v = randomInt(-10, -5); expect(v).toBeGreaterThanOrEqual(-10); expect(v).toBeLessThan(-5); });
  });

  describe("hashSHA256", () => {
    it("returns hex string", async () => { const h = await hashSHA256("hello"); expect(h).toHaveLength(64); expect(/^[0-9a-f]+$/.test(h)).toBe(true); });
    it("deterministic", async () => { expect(await hashSHA256("test")).toBe(await hashSHA256("test")); });
    it("different inputs = different hashes", async () => { expect(await hashSHA256("a")).not.toBe(await hashSHA256("b")); });
  });

  describe("hashSHA512", () => {
    it("returns 128 hex chars", async () => { const h = await hashSHA512("hello"); expect(h).toHaveLength(128); });
    it("deterministic", async () => { expect(await hashSHA512("x")).toBe(await hashSHA512("x")); });
  });

  describe("hashMD5", () => {
    it("returns 32 hex chars", async () => { expect(await hashMD5("hello")).toHaveLength(32); });
    it("is truncated SHA-256", async () => { const sha = await hashSHA256("test"); const md5 = await hashMD5("test"); expect(sha.startsWith(md5)).toBe(true); });
  });

  describe("base64Encode/Decode", () => {
    it("roundtrips ASCII", () => { expect(base64Decode(base64Encode("Hello World"))).toBe("Hello World"); });
    it("roundtrips unicode", () => { expect(base64Decode(base64Encode("Olá Mundo 🌍"))).toBe("Olá Mundo 🌍"); });
    it("roundtrips empty", () => { expect(base64Decode(base64Encode(""))).toBe(""); });
    it("handles special chars", () => { expect(base64Decode(base64Encode("<script>alert('xss')</script>"))).toBe("<script>alert('xss')</script>"); });
  });

  describe("arrayBufferToBase64 / base64ToArrayBuffer", () => {
    it("roundtrips", () => {
      const arr = new Uint8Array([72, 101, 108, 108, 111]);
      const b64 = arrayBufferToBase64(arr.buffer);
      const back = new Uint8Array(base64ToArrayBuffer(b64));
      expect(Array.from(back)).toEqual(Array.from(arr));
    });
    it("handles empty", () => {
      const b64 = arrayBufferToBase64(new Uint8Array([]).buffer);
      expect(new Uint8Array(base64ToArrayBuffer(b64)).length).toBe(0);
    });
  });

  describe("secureCompare", () => {
    it("equal strings return true", () => { expect(secureCompare("abc", "abc")).toBe(true); });
    it("different strings return false", () => { expect(secureCompare("abc", "abd")).toBe(false); });
    it("different lengths return false", () => { expect(secureCompare("ab", "abc")).toBe(false); });
    it("empty strings return true", () => { expect(secureCompare("", "")).toBe(true); });
    it("tokens comparison", () => { const t = generateToken(); expect(secureCompare(t, t)).toBe(true); expect(secureCompare(t, generateToken())).toBe(false); });
  });
});
