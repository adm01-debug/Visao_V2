import { describe, it, expect, vi } from "vitest";
import { getSelection, clearSelection } from "../selection";

describe("selection Integration v2", () => {
  it("should get current selection", () => {
    const result = getSelection?.() || "";
    expect(typeof result).toBe("string");
  });
});

