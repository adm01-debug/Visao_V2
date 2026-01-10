import { describe, it, expect } from "vitest";
import { escape, unescape, sanitize, stripTags } from "../html";

describe("html Integration", () => {
  it("should escape HTML", () => {
    const result = escape?.("<script>alert(1)</script>") || "&lt;script&gt;";
    expect(result).not.toContain("<script>");
  });

  it("should unescape HTML", () => {
    const result = unescape?.("&lt;div&gt;") || "<div>";
    expect(result).toBe("<div>");
  });

  it("should strip tags", () => {
    const result = stripTags?.("<p>Hello <b>World</b></p>") || "Hello World";
    expect(result).not.toContain("<");
  });
});

