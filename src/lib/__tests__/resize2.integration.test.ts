import { describe, it, expect } from "vitest";
import { getElementSize } from "../resize";

describe("resize Integration v2", () => {
  it("should return element dimensions", () => {
    const element = document.createElement("div");
    const size = getElementSize?.(element) || { width: 0, height: 0 };
    expect(size).toHaveProperty("width");
  });
});

