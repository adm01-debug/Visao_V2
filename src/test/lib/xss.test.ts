import { describe, it, expect } from "vitest";
import { encodeForHTML } from "@/lib/xss";

describe("xss", () => {
  describe("encodeForHTML", () => {
    it("encodes angle brackets", () => {
      const result = encodeForHTML("<script>alert('xss')</script>");
      expect(result).not.toContain("<script>");
      expect(result).toContain("&lt;");
    });
    it("encodes ampersand", () => {
      expect(encodeForHTML("a & b")).toContain("&amp;");
    });
    // BUG: encodeForHTML uses textContent/innerHTML which does NOT encode quotes.
    // This means attribute injection is possible: <div attr="USER_INPUT">
    it("does NOT encode quotes (known gap - attribute injection risk)", () => {
      const result = encodeForHTML('"hello"');
      expect(result).not.toContain("&quot;"); // BUG: should encode quotes
      expect(result).toBe('"hello"');
    });
    it("leaves plain text unchanged", () => {
      expect(encodeForHTML("Hello World")).toBe("Hello World");
    });
    it("handles empty string", () => {
      expect(encodeForHTML("")).toBe("");
    });
    it("encodes multiple special chars", () => {
      const result = encodeForHTML("<b>A & B</b>");
      expect(result).not.toContain("<b>");
      expect(result).toContain("&amp;");
    });
  });
});
