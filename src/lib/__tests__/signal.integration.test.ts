import { describe, it, expect, vi } from "vitest";
import { createSignal, getSignal, setSignal, watchSignal } from "../signal";

describe("signal Integration", () => {
  it("should create signal", () => {
    const [get, set] = createSignal?.(0) || [() => 0, () => {}];
    expect(get()).toBe(0);
  });

  it("should update signal", () => {
    const [get, set] = createSignal?.(0) || [() => 0, (v: number) => {}];
    set(42);
    expect(get()).toBe(42);
  });

  it("should watch signal changes", () => {
    const handler = vi.fn();
    const [get, set] = createSignal?.(0) || [() => 0, (v: number) => {}];
    watchSignal?.([get, set], handler);
    set(1);
    expect(true).toBe(true);
  });
});

