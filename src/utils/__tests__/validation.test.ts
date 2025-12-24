import { describe, it, expect } from "vitest";
import { isValidEmail, isValidPassword, isValidUrl, isValidPhone, sanitizeInput } from "../validation";

describe("validation utils", () => {
  describe("isValidEmail", () => {
    it("validates correct emails", () => {
      expect(isValidEmail("test@example.com")).toBe(true);
      expect(isValidEmail("user.name@domain.co")).toBe(true);
    });

    it("rejects invalid emails", () => {
      expect(isValidEmail("invalid")).toBe(false);
      expect(isValidEmail("@domain.com")).toBe(false);
    });
  });

  describe("isValidPassword", () => {
    it("validates password length", () => {
      expect(isValidPassword("12345678")).toBe(true);
      expect(isValidPassword("short")).toBe(false);
    });
  });

  describe("isValidUrl", () => {
    it("validates URLs", () => {
      expect(isValidUrl("https://example.com")).toBe(true);
      expect(isValidUrl("not-a-url")).toBe(false);
    });
  });

  describe("sanitizeInput", () => {
    it("removes HTML tags", () => {
      expect(sanitizeInput("<script>alert(1)</script>")).toBe("alert(1)");
      expect(sanitizeInput("  hello  ")).toBe("hello");
    });
  });
});
