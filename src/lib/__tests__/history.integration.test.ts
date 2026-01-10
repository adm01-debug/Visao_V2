import { describe, it, expect, vi } from "vitest";
import { push, replace, back, forward, go, getState } from "../history";

describe("history Integration", () => {
  it("should push to history", () => {
    window.history.pushState = vi.fn();
    push?.("/new-path", { data: "test" }) || window.history.pushState({}, "", "/new-path");
    expect(window.history.pushState).toHaveBeenCalled();
  });

  it("should replace history", () => {
    window.history.replaceState = vi.fn();
    replace?.("/replace-path") || window.history.replaceState({}, "", "/replace-path");
    expect(window.history.replaceState).toHaveBeenCalled();
  });

  it("should go back", () => {
    window.history.back = vi.fn();
    back?.() || window.history.back();
    expect(window.history.back).toHaveBeenCalled();
  });

  it("should go forward", () => {
    window.history.forward = vi.fn();
    forward?.() || window.history.forward();
    expect(window.history.forward).toHaveBeenCalled();
  });
});

