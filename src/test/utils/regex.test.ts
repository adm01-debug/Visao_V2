import { describe, it, expect } from "vitest";
import {
  isEmail, isPhone, isUrl, isIpv4, isUuid, isHex, isCpf, isCnpj,
  isCep, isLicensePlate, isSlug, isStrongPassword,
  escapeRegex, matchAll, replaceAll, countMatches,
} from "@/utils/regex";

describe("regex utils", () => {
  describe("isEmail", () => {
    it("validates emails", () => {
      expect(isEmail("user@example.com")).toBe(true);
      expect(isEmail("a.b+c@d.co")).toBe(true);
      expect(isEmail("invalid")).toBe(false);
      expect(isEmail("@domain.com")).toBe(false);
    });
  });

  describe("isPhone", () => {
    it("validates phones", () => {
      expect(isPhone("+55 11 98765-4321")).toBe(true);
      expect(isPhone("1234567890")).toBe(true);
      expect(isPhone("123")).toBe(false);
    });
  });

  describe("isUrl", () => {
    it("validates URLs", () => {
      expect(isUrl("https://example.com")).toBe(true);
      expect(isUrl("http://localhost:3000/path")).toBe(true);
      expect(isUrl("not-a-url")).toBe(false);
    });
  });

  describe("isIpv4", () => {
    it("validates IPv4", () => {
      expect(isIpv4("192.168.1.1")).toBe(true);
      expect(isIpv4("255.255.255.255")).toBe(true);
      expect(isIpv4("0.0.0.0")).toBe(true);
      expect(isIpv4("256.1.1.1")).toBe(false);
      expect(isIpv4("1.2.3")).toBe(false);
    });
  });

  describe("isUuid", () => {
    it("validates UUIDs", () => {
      expect(isUuid("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
      expect(isUuid("not-a-uuid")).toBe(false);
      expect(isUuid("550e8400-e29b-61d4-a716-446655440000")).toBe(false); // v6 not in range
    });
  });

  describe("isHex", () => {
    it("validates hex colors", () => {
      expect(isHex("#ff0000")).toBe(true);
      expect(isHex("#FFF")).toBe(true);
      expect(isHex("ff0000")).toBe(true);
      expect(isHex("#xyz")).toBe(false);
    });
  });

  describe("Brazilian patterns", () => {
    it("validates CPF", () => {
      expect(isCpf("123.456.789-01")).toBe(true);
      expect(isCpf("12345678901")).toBe(true);
      expect(isCpf("123")).toBe(false);
    });
    it("validates CNPJ", () => {
      expect(isCnpj("12.345.678/0001-90")).toBe(true);
      expect(isCnpj("12345678000190")).toBe(true);
      expect(isCnpj("123")).toBe(false);
    });
    it("validates CEP", () => {
      expect(isCep("01234-567")).toBe(true);
      expect(isCep("01234567")).toBe(true);
      expect(isCep("1234")).toBe(false);
    });
    it("validates license plates", () => {
      expect(isLicensePlate("ABC-1234")).toBe(true);
      expect(isLicensePlate("ABC1D23")).toBe(true); // Mercosul
      expect(isLicensePlate("123-ABC")).toBe(false);
    });
  });

  describe("isSlug", () => {
    it("validates slugs", () => {
      expect(isSlug("hello-world")).toBe(true);
      expect(isSlug("test123")).toBe(true);
      expect(isSlug("Hello World")).toBe(false);
      expect(isSlug("")).toBe(false);
    });
  });

  describe("isStrongPassword", () => {
    it("validates strong passwords", () => {
      expect(isStrongPassword("Str0ng@Pass")).toBe(true);
      expect(isStrongPassword("weak")).toBe(false);
      expect(isStrongPassword("NoSpecial1")).toBe(false);
      expect(isStrongPassword("nouppercase1!")).toBe(false);
    });
  });

  describe("escapeRegex", () => {
    it("escapes special chars", () => {
      expect(escapeRegex("hello.world")).toBe("hello\\.world");
      expect(escapeRegex("a+b*c?")).toBe("a\\+b\\*c\\?");
      expect(escapeRegex("(test)")).toBe("\\(test\\)");
    });
  });

  describe("matchAll", () => {
    it("finds all matches", () => {
      const matches = matchAll("foo bar foo baz foo", /foo/g);
      expect(matches).toHaveLength(3);
    });
  });

  describe("replaceAll", () => {
    it("replaces all occurrences", () => {
      expect(replaceAll("foo bar foo", "foo", "baz")).toBe("baz bar baz");
    });
  });

  describe("countMatches", () => {
    it("counts matches", () => {
      expect(countMatches("aaa bbb aaa", /aaa/g)).toBe(2);
      expect(countMatches("nothing", /xyz/g)).toBe(0);
    });
  });
});
