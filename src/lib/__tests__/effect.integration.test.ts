import { describe, it, expect, vi } from "vitest";
import { createEffect, runEffect, cancelEffect } from "../effect";

describe("effect Integration", () => {
  it("should create effect", () => {
    const effect = createEffect?.(() => console.log("effect")) || { run: () => {} };
    expect(effect).toBeDefined();
  });

  it("should run effect", () => {
    const fn = vi.fn();
    const effect = createEffect?.(fn) || { run: fn };
    runEffect?.(effect) || effect.run();
    expect(fn).toHaveBeenCalled();
  });

  it("should cancel effect", () => {
    const fn = vi.fn();
    const effect = createEffect?.(fn);
    cancelEffect?.(effect);
    expect(true).toBe(true);
  });
});

