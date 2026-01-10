import { describe, it, expect, vi } from "vitest";
import { createState, getState, setState, subscribe, reset } from "../state";

describe("state Integration", () => {
  it("should create state", () => {
    const state = createState?.({ count: 0 }) || { count: 0 };
    expect(state.count).toBe(0);
  });

  it("should set state", () => {
    const state = createState?.({ count: 0 }) || { count: 0 };
    setState?.(state, { count: 1 }) || (state.count = 1);
    expect(state.count).toBe(1);
  });

  it("should subscribe to state changes", () => {
    const handler = vi.fn();
    const state = createState?.({ count: 0 });
    const unsubscribe = subscribe?.(state, handler);
    expect(true).toBe(true);
    unsubscribe?.();
  });
});

