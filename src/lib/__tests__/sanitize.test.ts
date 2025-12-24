import { describe, it, expect } from "vitest";
import { sanitizeHtml, sanitizeText, containsXSS } from "../sanitize";

describe("sanitize", () => {
  describe("sanitizeHtml", () => {
    it("should allow safe HTML tags", () => {
      const input = "<b>bold</b> and <i>italic</i>";
      expect(sanitizeHtml(input)).toBe("<b>bold</b> and <i>italic</i>");
    });

    it("should remove dangerous scripts", () => {
      const input = "<script>alert(1)</script><b>safe</b>";
      expect(sanitizeHtml(input)).toBe("<b>safe</b>");
    });

    it("should remove onclick handlers", () => {
      const input = "<div onclick=\"alert(1)\">click</div>";
      const result = sanitizeHtml(input);
      expect(result).not.toContain("onclick");
    });
  });

  describe("sanitizeText", () => {
    it("should remove all HTML", () => {
      const input = "<b>bold</b> text";
      expect(sanitizeText(input)).toBe("bold text");
    });
  });

  describe("containsXSS", () => {
    it("should detect XSS attempts", () => {
      expect(containsXSS("<script>alert(1)</script>")).toBe(true);
      expect(containsXSS("<b>safe</b>")).toBe(false);
    });
  });
});
