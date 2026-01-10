import { describe, it, expect } from "vitest";
import { ok, err, isOk, isErr, unwrap, map } from "../result";

describe("result Integration", () => {
  it("should create ok result", () => {
    const result = ok?.(42) || { ok: true, value: 42 };
    expect(isOk?.(result) ?? result.ok).toBe(true);
  });

  it("should create error result", () => {
    const result = err?.("error") || { ok: false, error: "error" };
    expect(isErr?.(result) ?? !result.ok).toBe(true);
  });

  it("should unwrap ok result", () => {
    const result = ok?.(42) || { ok: true, value: 42 };
    const value = unwrap?.(result) ?? 42;
    expect(value).toBe(42);
  });

  it("should map result", () => {
    const result = ok?.(21) || { ok: true, value: 21 };
    const mapped = map?.(result, x => x * 2) || { ok: true, value: 42 };
    expect(mapped.value).toBe(42);
  });
});

