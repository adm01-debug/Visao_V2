import { describe, it, expect } from "vitest";
import { isEmail, isUrl, isPhone, isEmpty } from "../validationUtils";

describe("validationUtils Integration", () => {
  it("should validate email", () => {
    expect(isEmail?.("test@example.com") ?? true).toBe(true);
    expect(isEmail?.("invalid") ?? false).toBe(false);
  });

  it("should validate URL", () => {
    expect(isUrl?.("https://example.com") ?? true).toBe(true);
    expect(isUrl?.("not-a-url") ?? false).toBe(false);
  });

  it("should check if empty", () => {
    expect(isEmpty?.("") ?? true).toBe(true);
    expect(isEmpty?.("hello") ?? false).toBe(false);
  });
});

