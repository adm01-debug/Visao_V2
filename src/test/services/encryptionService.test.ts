import { describe, it, expect } from "vitest";
import { encryptionService } from "@/services/encryptionService";

describe("encryptionService", () => {
  describe("generateRandomString", () => {
    it("generates correct length", () => {
      expect(encryptionService.generateRandomString(16)).toHaveLength(16);
    });
    it("generates hex chars only", () => {
      const s = encryptionService.generateRandomString(32);
      expect(/^[0-9a-f]+$/.test(s)).toBe(true);
    });
    it("unique strings", () => {
      const a = encryptionService.generateRandomString(16);
      const b = encryptionService.generateRandomString(16);
      expect(a).not.toBe(b);
    });
  });

  describe("hash", () => {
    it("returns hex hash", async () => {
      const h = await encryptionService.hash("hello");
      expect(typeof h).toBe("string");
      expect(h.length).toBeGreaterThan(0);
    });
    it("deterministic", async () => {
      expect(await encryptionService.hash("test")).toBe(await encryptionService.hash("test"));
    });
    it("different inputs differ", async () => {
      expect(await encryptionService.hash("a")).not.toBe(await encryptionService.hash("b"));
    });
  });
});
