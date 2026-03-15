import { describe, it, expect } from "vitest";
import { createTwoFactorAuth } from "@/lib/twoFactorAuth";

describe("TwoFactorAuth", () => {
  const tfa = createTwoFactorAuth({ issuer: "VISAO" });

  describe("generateSecret", () => {
    it("returns base32 string", () => {
      const secret = tfa.generateSecret();
      expect(secret).toHaveLength(20);
      expect(/^[A-Z2-7]+$/.test(secret)).toBe(true);
    });

    it("generates unique secrets", () => {
      const s1 = tfa.generateSecret();
      const s2 = tfa.generateSecret();
      expect(s1).not.toBe(s2);
    });
  });

  describe("generateBackupCodes", () => {
    it("default generates 10 codes", () => {
      const codes = tfa.generateBackupCodes();
      expect(codes).toHaveLength(10);
    });

    it("custom count", () => {
      expect(tfa.generateBackupCodes(5)).toHaveLength(5);
    });

    it("codes are hex uppercase", () => {
      const codes = tfa.generateBackupCodes(3);
      codes.forEach(code => {
        expect(/^[0-9A-F]+$/.test(code)).toBe(true);
        expect(code).toHaveLength(8);
      });
    });

    it("codes are unique", () => {
      const codes = tfa.generateBackupCodes(20);
      expect(new Set(codes).size).toBe(20);
    });
  });

  describe("getQrCodeUrl", () => {
    it("returns valid URL", () => {
      const url = tfa.getQrCodeUrl("SECRET123", "user@test.com");
      expect(url).toContain("api.qrserver.com");
      expect(url).toContain("otpauth");
      expect(url).toContain("VISAO");
    });
  });

  describe("setup", () => {
    it("returns secret, QR code URL, and backup codes", async () => {
      const result = await tfa.setup("user@test.com");
      expect(result.secret).toBeDefined();
      expect(result.qrCodeUrl).toContain("api.qrserver.com");
      expect(result.backupCodes).toHaveLength(10);
    });
  });

  describe("getCurrentToken", () => {
    it("returns 6-digit string", () => {
      const token = tfa.getCurrentToken("ABCDEFGH");
      expect(token).toHaveLength(6);
      expect(/^\d{6}$/.test(token)).toBe(true);
    });

    it("deterministic for same time and secret", () => {
      const t1 = tfa.getCurrentToken("SAME");
      const t2 = tfa.getCurrentToken("SAME");
      expect(t1).toBe(t2);
    });
  });

  describe("getTimeRemaining", () => {
    it("returns number between 0 and 30", () => {
      const remaining = tfa.getTimeRemaining();
      expect(remaining).toBeGreaterThanOrEqual(0);
      expect(remaining).toBeLessThanOrEqual(30);
    });
  });

  describe("custom config", () => {
    it("respects custom digits and period", () => {
      const custom = createTwoFactorAuth({ issuer: "Test", digits: 8, period: 60 });
      const remaining = custom.getTimeRemaining();
      expect(remaining).toBeLessThanOrEqual(60);
    });
  });
});
