import { describe, it, expect } from "vitest";
import { formatPhoneBR, formatPhoneUS, cleanPhone, isValidPhoneBR } from "@/lib/formatPhone";

describe("formatPhone", () => {
  describe("formatPhoneBR", () => {
    it("formats 11-digit mobile", () => {
      expect(formatPhoneBR("11999999999")).toBe("(11) 99999-9999");
    });
    it("formats 10-digit landline", () => {
      expect(formatPhoneBR("1133334444")).toBe("(11) 3333-4444");
    });
    it("strips non-digits before formatting", () => {
      expect(formatPhoneBR("(11) 99999-9999")).toBe("(11) 99999-9999");
    });
    it("returns original for wrong length", () => {
      expect(formatPhoneBR("123")).toBe("123");
    });
  });

  describe("formatPhoneUS", () => {
    it("formats 10-digit", () => {
      expect(formatPhoneUS("2125551234")).toBe("(212) 555-1234");
    });
    it("returns original for wrong length", () => {
      expect(formatPhoneUS("12345")).toBe("12345");
    });
  });

  describe("cleanPhone", () => {
    it("removes all non-digits", () => {
      expect(cleanPhone("+55 (11) 99999-9999")).toBe("5511999999999");
    });
    it("handles clean number", () => {
      expect(cleanPhone("11999999999")).toBe("11999999999");
    });
  });

  describe("isValidPhoneBR", () => {
    it("valid 11 digits", () => expect(isValidPhoneBR("11999999999")).toBe(true));
    it("valid 10 digits", () => expect(isValidPhoneBR("1133334444")).toBe(true));
    it("valid with formatting", () => expect(isValidPhoneBR("(11) 99999-9999")).toBe(true));
    it("invalid too short", () => expect(isValidPhoneBR("123")).toBe(false));
    it("invalid too long", () => expect(isValidPhoneBR("111999999999")).toBe(false));
  });
});
