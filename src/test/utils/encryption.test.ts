import { describe, it, expect } from "vitest";
import { randomBytes, generateToken, hash, hashHex } from "@/utils/encryption";

describe("encryption utils", () => {
  describe("randomBytes", () => {
    it("generates correct length", () => {
      expect(randomBytes(16).length).toBe(16);
      expect(randomBytes(32).length).toBe(32);
    });
    it("generates unique bytes", () => {
      const a = randomBytes(16);
      const b = randomBytes(16);
      expect(Array.from(a)).not.toEqual(Array.from(b));
    });
    it("handles 0 length", () => {
      expect(randomBytes(0).length).toBe(0);
    });
  });

  describe("generateToken", () => {
    it("default length 64 hex chars (32 bytes)", () => {
      const token = generateToken();
      expect(token).toHaveLength(64);
      expect(/^[0-9a-f]+$/.test(token)).toBe(true);
    });
    it("custom length", () => {
      const token = generateToken(8);
      expect(token).toHaveLength(16); // 8 bytes = 16 hex chars
    });
    it("unique tokens", () => {
      const tokens = new Set(Array.from({ length: 10 }, () => generateToken()));
      expect(tokens.size).toBe(10);
    });
  });

  describe("hash", () => {
    it("returns base64 string", async () => {
      const h = await hash("hello");
      expect(typeof h).toBe("string");
      expect(h.length).toBeGreaterThan(0);
    });
    it("deterministic", async () => {
      expect(await hash("test")).toBe(await hash("test"));
    });
    it("different inputs differ", async () => {
      expect(await hash("a")).not.toBe(await hash("b"));
    });
  });

  describe("hashHex", () => {
    it("returns hex string", async () => {
      const h = await hashHex("hello");
      expect(/^[0-9a-f]+$/.test(h)).toBe(true);
    });
    it("deterministic", async () => {
      expect(await hashHex("test")).toBe(await hashHex("test"));
    });
  });
});
