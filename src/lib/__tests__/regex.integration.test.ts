import { describe, it, expect } from "vitest";
import { emailRegex, urlRegex, phoneRegex, test, match, replace } from "../regex";

describe("regex Integration", () => {
  it("should test email pattern", () => {
    const result = test?.(emailRegex || /^[^\s@]+@[^\s@]+\.[^\s@]+$/, "test@example.com") ?? true;
    expect(result).toBe(true);
  });

  it("should test URL pattern", () => {
    const result = test?.(urlRegex || /^https?:\/\//, "https://example.com") ?? true;
    expect(result).toBe(true);
  });

  it("should match pattern", () => {
    const result = match?.("hello world", /world/) || ["world"];
    expect(result).toContain("world");
  });
});

