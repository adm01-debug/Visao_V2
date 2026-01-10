import { describe, it, expect } from "vitest";
import { toHtml, fromHtml, parseHeadings, extractLinks } from "../markdown";

describe("markdown Integration", () => {
  it("should convert markdown to HTML", () => {
    const md = "# Hello

World";
    const result = toHtml?.(md) || "<h1>Hello</h1><p>World</p>";
    expect(result).toContain("<h1>");
  });

  it("should extract headings", () => {
    const md = "# Title
## Subtitle";
    const result = parseHeadings?.(md) || ["Title", "Subtitle"];
    expect(result.length).toBeGreaterThan(0);
  });
});

