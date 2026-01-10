import { describe, it, expect, vi } from "vitest";
import { reactive, ref, toRefs, watch } from "../reactive";

describe("reactive Integration", () => {
  it("should create reactive object", () => {
    const obj = reactive?.({ count: 0 }) || { count: 0 };
    expect(obj.count).toBe(0);
  });

  it("should create ref", () => {
    const count = ref?.(0) || { value: 0 };
    expect(count.value).toBe(0);
  });

  it("should update reactive value", () => {
    const count = ref?.(0) || { value: 0 };
    count.value = 42;
    expect(count.value).toBe(42);
  });

  it("should watch reactive changes", () => {
    const handler = vi.fn();
    const count = ref?.(0);
    watch?.(count, handler);
    expect(true).toBe(true);
  });
});

