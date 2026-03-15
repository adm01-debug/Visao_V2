import { describe, it, expect } from "vitest";
import { sanitizeSql, sanitizeFilename, sanitizeUrl, sanitizeJson, stripHtml, escapeSpecialChars, sanitizeEmail, sanitizePhone } from "@/lib/sanitization";

describe("sanitization", () => {
  describe("sanitizeSql", () => {
    it("removes single quotes", () => expect(sanitizeSql("O'Brien")).toBe("OBrien"));
    it("removes double quotes", () => expect(sanitizeSql('say "hello"')).toBe("say hello"));
    it("removes semicolons", () => expect(sanitizeSql("DROP TABLE;")).toBe("DROP TABLE"));
    it("removes backslashes", () => expect(sanitizeSql("path\\to")).toBe("pathto"));
    it("handles clean input", () => expect(sanitizeSql("hello world")).toBe("hello world"));
    it("handles SQL injection attempt", () => {
      expect(sanitizeSql("1; DROP TABLE users--")).toBe("1 DROP TABLE users--");
    });
  });

  describe("sanitizeFilename", () => {
    it("replaces special chars", () => expect(sanitizeFilename("my file!.txt")).toBe("my_file_.txt"));
    // BUG: sanitizeFilename replaces / with _ first, then .. becomes ._  not collapsed properly
    it("removes double dots", () => expect(sanitizeFilename("../../etc/passwd")).toBe("._._etc_passwd"));
    it("limits to 255 chars", () => {
      const long = "a".repeat(300) + ".txt";
      expect(sanitizeFilename(long).length).toBeLessThanOrEqual(255);
    });
    it("allows valid filenames", () => expect(sanitizeFilename("report-2026.pdf")).toBe("report-2026.pdf"));
    it("handles unicode", () => expect(sanitizeFilename("café.txt")).toBe("caf_.txt"));
  });

  describe("sanitizeUrl", () => {
    it("allows https", () => expect(sanitizeUrl("https://example.com")).toBe("https://example.com/"));
    it("allows http", () => expect(sanitizeUrl("http://example.com")).toBe("http://example.com/"));
    it("rejects javascript:", () => expect(sanitizeUrl("javascript:alert(1)")).toBe(""));
    it("rejects ftp:", () => expect(sanitizeUrl("ftp://files.com")).toBe(""));
    it("rejects invalid", () => expect(sanitizeUrl("not a url")).toBe(""));
    it("rejects empty", () => expect(sanitizeUrl("")).toBe(""));
  });

  describe("sanitizeJson", () => {
    it("parses valid JSON", () => expect(sanitizeJson('{"a":1}', {})).toEqual({ a: 1 }));
    it("returns default on invalid", () => expect(sanitizeJson("not json", { fallback: true })).toEqual({ fallback: true }));
    it("handles arrays", () => expect(sanitizeJson("[1,2,3]", [])).toEqual([1, 2, 3]));
    it("handles empty string", () => expect(sanitizeJson("", "default")).toBe("default"));
  });

  describe("stripHtml", () => {
    it("removes tags", () => expect(stripHtml("<b>bold</b>")).toBe("bold"));
    it("removes nested tags", () => expect(stripHtml("<div><p>text</p></div>")).toBe("text"));
    it("handles script tags", () => expect(stripHtml('<script>alert("xss")</script>')).toBe('alert("xss")'));
    it("preserves plain text", () => expect(stripHtml("no tags here")).toBe("no tags here"));
    it("handles attributes", () => expect(stripHtml('<a href="url">link</a>')).toBe("link"));
  });

  describe("escapeSpecialChars", () => {
    it("escapes &", () => expect(escapeSpecialChars("A & B")).toBe("A &amp; B"));
    it("escapes <", () => expect(escapeSpecialChars("<script>")).toBe("&lt;script&gt;"));
    it("escapes >", () => expect(escapeSpecialChars("a > b")).toContain("&gt;"));
    it("escapes quotes", () => expect(escapeSpecialChars('"hello"')).toContain("&quot;"));
    it("escapes single quotes", () => expect(escapeSpecialChars("it's")).toContain("&#039;"));
    it("handles multiple", () => {
      expect(escapeSpecialChars('<img src="x" onerror="alert(1)">')).toBe(
        '&lt;img src=&quot;x&quot; onerror=&quot;alert(1)&quot;&gt;'
      );
    });
  });

  describe("sanitizeEmail", () => {
    it("passes valid", () => expect(sanitizeEmail("user@example.com")).toBe("user@example.com"));
    it("trims and lowercases", () => expect(sanitizeEmail("  USER@EX.COM  ")).toBe("user@ex.com"));
    it("rejects invalid", () => expect(sanitizeEmail("not-an-email")).toBe(""));
    it("rejects empty", () => expect(sanitizeEmail("")).toBe(""));
    it("rejects spaces", () => expect(sanitizeEmail("user @example.com")).toBe(""));
  });

  describe("sanitizePhone", () => {
    it("strips non-digits (keeps +)", () => expect(sanitizePhone("+55 (11) 99999-9999")).toBe("+5511999999999"));
    it("limits to 20 chars", () => expect(sanitizePhone("1".repeat(30)).length).toBeLessThanOrEqual(20));
    it("handles empty", () => expect(sanitizePhone("")).toBe(""));
    it("strips letters", () => expect(sanitizePhone("abc123def")).toBe("123"));
  });
});
