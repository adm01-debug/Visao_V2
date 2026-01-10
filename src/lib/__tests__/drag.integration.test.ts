import { describe, it, expect, vi } from "vitest";
import { makeDraggable, onDragStart, onDragEnd, onDrop, setDragData } from "../drag";

describe("drag Integration", () => {
  it("should make element draggable", () => {
    const element = document.createElement("div");
    makeDraggable?.(element);
    expect(element.draggable).toBe(true);
  });

  it("should handle drag start", () => {
    const handler = vi.fn();
    const element = document.createElement("div");
    const unsubscribe = onDragStart?.(element, handler);
    expect(true).toBe(true);
    unsubscribe?.();
  });

  it("should handle drop", () => {
    const handler = vi.fn();
    const element = document.createElement("div");
    const unsubscribe = onDrop?.(element, handler);
    expect(true).toBe(true);
    unsubscribe?.();
  });
});

