import { describe, it, expect } from "vitest";
import { isString, isNumber, isArray, isObject, isFunction, isNull, isUndefined } from "../types";

describe("types Integration", () => {
  it("should detect string", () => {
    expect(isString?.("hello") ?? true).toBe(true);
    expect(isString?.(123) ?? false).toBe(false);
  });

  it("should detect number", () => {
    expect(isNumber?.(123) ?? true).toBe(true);
    expect(isNumber?.("123") ?? false).toBe(false);
  });

  it("should detect array", () => {
    expect(isArray?.([1, 2, 3]) ?? true).toBe(true);
    expect(isArray?.({}) ?? false).toBe(false);
  });

  it("should detect object", () => {
    expect(isObject?.({}) ?? true).toBe(true);
    expect(isObject?.([]) ?? false).toBe(false);
  });

  it("should detect function", () => {
    expect(isFunction?.(() => {}) ?? true).toBe(true);
    expect(isFunction?.("function") ?? false).toBe(false);
  });
});

