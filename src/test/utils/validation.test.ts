import { describe, it, expect } from "vitest";
import { isValidEmail, isValidPassword, isValidUrl, isValidPhone, sanitizeInput } from "@/utils/validation";

describe("validation utils", () => {
  // ===== isValidEmail =====
  describe("isValidEmail", () => {
    const validEmails = [
      "user@example.com", "admin@visao.com", "test.name@domain.co",
      "user+tag@gmail.com", "a@b.cc", "user123@test.org",
      "first.last@company.com.br", "user@sub.domain.com",
    ];
    const invalidEmails = [
      "", "plaintext", "@domain.com", "user@", "user@.", "user@.com",
      "user @domain.com", "user@domain", "user@@domain.com",
      "user@dom ain.com", " ", "@", "user@-domain.com",
    ];

    validEmails.forEach(email => {
      it(`accepts valid email: ${email}`, () => expect(isValidEmail(email)).toBe(true));
    });
    invalidEmails.forEach(email => {
      it(`rejects invalid email: "${email}"`, () => expect(isValidEmail(email)).toBe(false));
    });
  });

  // ===== isValidPassword =====
  describe("isValidPassword", () => {
    it("accepts passwords >= 8 chars", () => {
      expect(isValidPassword("12345678")).toBe(true);
      expect(isValidPassword("abcdefgh")).toBe(true);
      expect(isValidPassword("P@ssw0rd!Strong")).toBe(true);
      expect(isValidPassword("aaaaaaaa")).toBe(true);
    });
    it("rejects passwords < 8 chars", () => {
      expect(isValidPassword("")).toBe(false);
      expect(isValidPassword("1234567")).toBe(false);
      expect(isValidPassword("abc")).toBe(false);
      expect(isValidPassword("a")).toBe(false);
    });
    it("handles edge cases", () => {
      expect(isValidPassword("        ")).toBe(true); // 8 spaces
      expect(isValidPassword("1234567 ")).toBe(true); // 8 with space
    });
  });

  // ===== isValidUrl =====
  describe("isValidUrl", () => {
    const validUrls = [
      "https://example.com", "http://localhost:3000", "https://sub.domain.co/path",
      "http://192.168.1.1", "https://example.com/path?q=1&r=2#hash",
      "ftp://files.example.com",
    ];
    const invalidUrls = ["", "not-a-url", "example.com", "://missing-protocol", "   "];

    validUrls.forEach(url => {
      it(`accepts: ${url}`, () => expect(isValidUrl(url)).toBe(true));
    });
    invalidUrls.forEach(url => {
      it(`rejects: "${url}"`, () => expect(isValidUrl(url)).toBe(false));
    });
  });

  // ===== isValidPhone =====
  describe("isValidPhone", () => {
    it("accepts valid phones", () => {
      expect(isValidPhone("+55 11 98765-4321")).toBe(true);
      expect(isValidPhone("(11) 98765-4321")).toBe(true);
      expect(isValidPhone("+1 555 123 4567")).toBe(true);
      expect(isValidPhone("11987654321")).toBe(true);
    });
    it("rejects invalid phones", () => {
      expect(isValidPhone("123")).toBe(false);
      expect(isValidPhone("abc")).toBe(false);
      expect(isValidPhone("")).toBe(false);
    });
  });

  // ===== sanitizeInput =====
  describe("sanitizeInput", () => {
    it("removes HTML tags", () => {
      expect(sanitizeInput("<script>alert('xss')</script>")).toBe("alert('xss')");
      expect(sanitizeInput("<b>bold</b>")).toBe("bold");
      expect(sanitizeInput("<img src=x onerror=alert(1)>")).toBe("");
      expect(sanitizeInput("<div><p>nested</p></div>")).toBe("nested");
    });
    it("trims whitespace", () => {
      expect(sanitizeInput("  hello  ")).toBe("hello");
      expect(sanitizeInput("   ")).toBe("");
    });
    it("preserves clean input", () => {
      expect(sanitizeInput("normal text")).toBe("normal text");
      expect(sanitizeInput("text with 123 & symbols")).toBe("text with 123 & symbols");
    });
  });
});
