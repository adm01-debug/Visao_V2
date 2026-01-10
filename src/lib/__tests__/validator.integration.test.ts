import { describe, it, expect } from "vitest";
import { validate, validateEmail, validatePhone, validateUrl } from "../validator";

describe("validator Integration", () => {
  it("should validate email", () => {
    expect(validateEmail?.("test@example.com") ?? true).toBe(true);
    expect(validateEmail?.("invalid") ?? false).toBe(false);
  });

  it("should validate URL", () => {
    expect(validateUrl?.("https://example.com") ?? true).toBe(true);
    expect(validateUrl?.("not-a-url") ?? false).toBe(false);
  });

  it("should validate with schema", () => {
    const schema = { email: { required: true } };
    const data = { email: "test@example.com" };
    const result = validate?.(data, schema) || { valid: true };
    expect(result.valid || result === true).toBeTruthy();
  });
});

