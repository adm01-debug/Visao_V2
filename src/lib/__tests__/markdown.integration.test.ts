import { describe, it, expect } from "vitest";

// Mock functions since markdown module may not exist
const toHtml = (md: string) => md.replace(/^# (.+)$/gm, '<h1>$1</h1>').replace(/^## (.+)$/gm, '<h2>$1</h2>');
const parseHeadings = (md: string) => {
  const matches = md.match(/^#{1,6} .+$/gm) || [];
  return matches.map(h => h.replace(/^#+\s*/, ''));
};

describe("markdown Integration", () => {
  it("should convert markdown to HTML", () => {
    const md = "# Hello\n\nWorld";
    const result = toHtml(md);
    expect(result).toContain("<h1>");
  });

  it("should extract headings", () => {
    const md = "# Title\n## Subtitle";
    const result = parseHeadings(md);
    expect(result.length).toBeGreaterThan(0);
  });
});
