import { describe, it, expect } from "vitest";
import { validatePassword, getPasswordStrength, generateSecurePassword } from "@/lib/passwordPolicy";

describe("passwordPolicy", () => {
  describe("validatePassword", () => {
    it("rejects short passwords", () => {
      const result = validatePassword("Ab1!");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Mínimo 8 caracteres");
    });

    it("accepts strong password", () => {
      const result = validatePassword("MyStr0ng!Pass");
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("requires uppercase", () => {
      const result = validatePassword("mystr0ng!pass");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Inclua letra maiúscula");
    });

    it("requires lowercase", () => {
      const result = validatePassword("MYSTR0NG!PASS");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Inclua letra minúscula");
    });

    it("requires numbers", () => {
      const result = validatePassword("MyStrong!Pass");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Inclua número");
    });

    it("requires special chars", () => {
      const result = validatePassword("MyStr0ngPass");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Inclua caractere especial");
    });

    it("rejects common passwords", () => {
      const result = validatePassword("password");
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Senha muito comum");
    });

    it("rejects user info in password", () => {
      const result = validatePassword("John1234!@#", {}, ["john"]);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Não use informações pessoais");
    });

    it("custom policy - no uppercase required", () => {
      const result = validatePassword("mystr0ng!pass", { requireUppercase: false });
      expect(result.valid).toBe(true);
    });

    it("custom min length", () => {
      const result = validatePassword("Ab1!", { minLength: 4 });
      // still needs all char types, but length is ok
      expect(result.errors).not.toContain("Mínimo 4 caracteres");
    });

    it("max length exceeded", () => {
      const long = "A".repeat(130) + "a1!";
      const result = validatePassword(long);
      expect(result.errors).toContain("Máximo 128 caracteres");
    });

    it("score increases with length", () => {
      const short = validatePassword("Ab1!xxxx");
      const long = validatePassword("Ab1!xxxxxxxxxxxx");
      expect(long.score).toBeGreaterThanOrEqual(short.score);
    });

    it("provides suggestions for weak passwords", () => {
      const result = validatePassword("Ab1!xxxx");
      expect(result.suggestions.length).toBeGreaterThan(0);
    });
  });

  describe("getPasswordStrength", () => {
    it("score 0-29 = Fraca", () => expect(getPasswordStrength(10).label).toBe("Fraca"));
    it("score 30-49 = Razoável", () => expect(getPasswordStrength(40).label).toBe("Razoável"));
    it("score 50-69 = Boa", () => expect(getPasswordStrength(60).label).toBe("Boa"));
    it("score 70-89 = Forte", () => expect(getPasswordStrength(80).label).toBe("Forte"));
    it("score 90+ = Excelente", () => expect(getPasswordStrength(95).label).toBe("Excelente"));

    it("returns color", () => {
      expect(getPasswordStrength(10).color).toBe("red");
      expect(getPasswordStrength(95).color).toBe("green");
    });
  });

  describe("generateSecurePassword", () => {
    it("generates correct length", () => {
      expect(generateSecurePassword(16)).toHaveLength(16);
      expect(generateSecurePassword(32)).toHaveLength(32);
      expect(generateSecurePassword()).toHaveLength(16);
    });
    it("generates unique passwords", () => {
      const passwords = new Set(Array.from({ length: 50 }, () => generateSecurePassword()));
      expect(passwords.size).toBe(50);
    });
    it("generated password is usually valid", () => {
      // With 16 chars from full charset, high probability of passing all rules
      let validCount = 0;
      for (let i = 0; i < 20; i++) {
        if (validatePassword(generateSecurePassword(20)).valid) validCount++;
      }
      expect(validCount).toBeGreaterThan(10); // most should be valid
    });
  });
});
