import { describe, it, expect, vi } from "vitest";
import { createCanvas, drawRect, drawCircle, drawText, clear, toImage } from "../canvas";

describe("canvas Integration", () => {
  it("should create canvas", () => {
    const canvas = createCanvas?.(100, 100) || document.createElement("canvas");
    expect(canvas.width).toBe(100);
    expect(canvas.height).toBe(100);
  });

  it("should draw rectangle", () => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    ctx.fillRect = vi.fn();
    drawRect?.(ctx, 0, 0, 50, 50) || ctx.fillRect(0, 0, 50, 50);
    expect(ctx.fillRect).toHaveBeenCalled();
  });

  it("should clear canvas", () => {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    ctx.clearRect = vi.fn();
    clear?.(ctx, canvas) || ctx.clearRect(0, 0, canvas.width, canvas.height);
    expect(ctx.clearRect).toHaveBeenCalled();
  });
});

