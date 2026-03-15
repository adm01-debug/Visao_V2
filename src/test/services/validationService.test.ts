import { describe, it, expect } from "vitest";
import { validate } from "@/services/validationService";

describe("ValidationService", () => {
  describe("required", () => {
    it("fails on empty string", () => {
      const r = validate({ name: "" }, { name: { required: true } });
      expect(r.success).toBe(false);
      expect(r.errors![0].code).toBe("required");
    });
    it("fails on null", () => {
      const r = validate({ name: null as any }, { name: { required: true } });
      expect(r.success).toBe(false);
    });
    it("fails on undefined", () => {
      const r = validate({ name: undefined as any }, { name: { required: true } });
      expect(r.success).toBe(false);
    });
    it("passes on value", () => {
      const r = validate({ name: "John" }, { name: { required: true } });
      expect(r.success).toBe(true);
    });
  });

  describe("minLength / maxLength", () => {
    it("minLength fails", () => {
      const r = validate({ pw: "ab" }, { pw: { minLength: 3 } });
      expect(r.success).toBe(false);
      expect(r.errors![0].code).toBe("minLength");
    });
    it("minLength passes", () => {
      expect(validate({ pw: "abc" }, { pw: { minLength: 3 } }).success).toBe(true);
    });
    it("maxLength fails", () => {
      const r = validate({ pw: "abcdef" }, { pw: { maxLength: 5 } });
      expect(r.success).toBe(false);
    });
    it("maxLength passes", () => {
      expect(validate({ pw: "abc" }, { pw: { maxLength: 5 } }).success).toBe(true);
    });
  });

  describe("min / max (numbers)", () => {
    it("min fails", () => {
      const r = validate({ age: 5 }, { age: { min: 18 } });
      expect(r.success).toBe(false);
      expect(r.errors![0].code).toBe("min");
    });
    it("min passes", () => {
      expect(validate({ age: 18 }, { age: { min: 18 } }).success).toBe(true);
    });
    it("max fails", () => {
      const r = validate({ age: 200 }, { age: { max: 120 } });
      expect(r.success).toBe(false);
    });
    it("max passes", () => {
      expect(validate({ age: 50 }, { age: { max: 120 } }).success).toBe(true);
    });
  });

  describe("email", () => {
    it("valid email", () => {
      expect(validate({ e: "a@b.com" }, { e: { email: true } }).success).toBe(true);
    });
    it("invalid email", () => {
      expect(validate({ e: "not-email" }, { e: { email: true } }).success).toBe(false);
    });
    it("empty string fails", () => {
      expect(validate({ e: "" }, { e: { email: true } }).success).toBe(false);
    });
  });

  describe("url", () => {
    it("valid URL", () => {
      expect(validate({ u: "https://example.com" }, { u: { url: true } }).success).toBe(true);
    });
    it("invalid URL", () => {
      expect(validate({ u: "not a url" }, { u: { url: true } }).success).toBe(false);
    });
  });

  describe("pattern", () => {
    it("matches pattern", () => {
      expect(validate({ code: "ABC123" }, { code: { pattern: /^[A-Z]{3}\d{3}$/ } }).success).toBe(true);
    });
    it("fails pattern", () => {
      expect(validate({ code: "abc" }, { code: { pattern: /^[A-Z]{3}\d{3}$/ } }).success).toBe(false);
    });
  });

  describe("custom validator", () => {
    it("custom passes", () => {
      const r = validate({ v: 10 }, { v: { custom: (v: number) => v > 5 ? null : "too low" } });
      expect(r.success).toBe(true);
    });
    it("custom fails", () => {
      const r = validate({ v: 3 }, { v: { custom: (v: number) => v > 5 ? null : "too low" } });
      expect(r.success).toBe(false);
      expect(r.errors![0].message).toBe("too low");
    });
  });

  describe("multiple rules", () => {
    it("collects multiple errors", () => {
      const r = validate(
        { name: "", age: -1 },
        { name: { required: true, minLength: 2 }, age: { min: 0 } }
      );
      expect(r.success).toBe(false);
      expect(r.errors!.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("no schema rules", () => {
    it("passes with empty schema", () => {
      expect(validate({ a: 1 }, {}).success).toBe(true);
    });
  });
});
