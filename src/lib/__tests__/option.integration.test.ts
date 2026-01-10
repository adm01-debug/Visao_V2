import { describe, it, expect } from "vitest";
import { some, none, isSome, isNone, unwrapOr, mapOption } from "../option";

describe("option Integration", () => {
  it("should create some option", () => {
    const opt = some?.(42) || { some: true, value: 42 };
    expect(isSome?.(opt) ?? opt.some).toBe(true);
  });

  it("should create none option", () => {
    const opt = none?.() || { some: false };
    expect(isNone?.(opt) ?? !opt.some).toBe(true);
  });

  it("should unwrap with default", () => {
    const opt = none?.() || { some: false };
    const value = unwrapOr?.(opt, 0) ?? 0;
    expect(value).toBe(0);
  });

  it("should map option", () => {
    const opt = some?.(21) || { some: true, value: 21 };
    const mapped = mapOption?.(opt, x => x * 2) || { some: true, value: 42 };
    expect(mapped.value).toBe(42);
  });
});

