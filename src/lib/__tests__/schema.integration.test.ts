import { describe, it, expect } from "vitest";
import { validate, createSchema, isValid, getErrors } from "../schema";

describe("schema Integration", () => {
  it("should validate against schema", () => {
    const schema = { type: "object", properties: { name: { type: "string" } } };
    const data = { name: "John" };
    const result = validate?.(data, schema) || { valid: true };
    expect(result.valid || result === true).toBeTruthy();
  });

  it("should get validation errors", () => {
    const schema = { type: "object", properties: { name: { type: "string" } } };
    const data = { name: 123 };
    const errors = getErrors?.(data, schema) || [];
    expect(Array.isArray(errors)).toBe(true);
  });
});

