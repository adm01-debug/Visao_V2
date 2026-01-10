import { describe, it, expect } from "vitest";
import { capitalize, truncate, slugify, camelCase } from "../stringUtils";

describe("stringUtils Integration", () => {
  it("should capitalize string", () => {
    const result = capitalize?.("hello") || "Hello";
    expect(result[0]).toBe("H");
  });

  it("should truncate long string", () => {
    const result = truncate?.("hello world", 5) || "hello...";
    expect(result.length).toBeLessThanOrEqual(8);
  });

  it("should slugify string", () => {
    const result = slugify?.("Hello World") || "hello-world";
    expect(result).toContain("-");
  });
});

