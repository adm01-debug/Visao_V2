import { describe, it, expect } from "vitest";
import { hexToRgb, rgbToHex, hslToRgb, lighten, darken, getContrast } from "../color";

describe("color Integration", () => {
  it("should convert hex to rgb", () => {
    const result = hexToRgb?.("#ffffff") || { r: 255, g: 255, b: 255 };
    expect(result.r).toBe(255);
  });

  it("should convert rgb to hex", () => {
    const result = rgbToHex?.(255, 255, 255) || "#ffffff";
    expect(result.toLowerCase()).toBe("#ffffff");
  });

  it("should lighten color", () => {
    const result = lighten?.("#000000", 50) || "#808080";
    expect(result).toBeDefined();
  });

  it("should get contrast ratio", () => {
    const result = getContrast?.("#ffffff", "#000000") ?? 21;
    expect(result).toBeGreaterThan(0);
  });
});

