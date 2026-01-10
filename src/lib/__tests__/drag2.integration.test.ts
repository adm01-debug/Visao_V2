import { describe, it, expect, vi } from "vitest";
import { makeDraggable } from "../drag";

describe("drag Integration v2", () => {
  it("should enable draggable attribute", () => {
    const element = document.createElement("div");
    makeDraggable?.(element);
    expect(element.draggable).toBe(true);
  });
});

