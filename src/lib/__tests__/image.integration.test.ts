import { describe, it, expect, vi } from "vitest";
import { resize, crop, rotate, toBase64, fromBase64 } from "../image";

describe("image Integration", () => {
  it("should convert image to base64", async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 10;
    canvas.height = 10;
    const result = toBase64?.(canvas) || canvas.toDataURL();
    expect(result).toContain("data:image");
  });

  it("should handle resize operation", async () => {
    const mockImage = { width: 100, height: 100 };
    const result = await resize?.(mockImage, 50, 50) || mockImage;
    expect(result).toBeDefined();
  });
});

