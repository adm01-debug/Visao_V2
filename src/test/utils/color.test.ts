import { describe, it, expect } from "vitest";
import {
  hexToRgb, rgbToHex, rgbToHsl, hslToRgb, lighten, darken,
  isLight, contrastColor, luminance, contrastRatio, mix, opacity, randomColor,
} from "@/utils/color";

describe("color utils", () => {
  describe("hexToRgb", () => {
    it("converts 6-digit hex", () => {
      expect(hexToRgb("#ff0000")).toEqual({ r: 255, g: 0, b: 0 });
      expect(hexToRgb("#00ff00")).toEqual({ r: 0, g: 255, b: 0 });
      expect(hexToRgb("#000000")).toEqual({ r: 0, g: 0, b: 0 });
      expect(hexToRgb("#ffffff")).toEqual({ r: 255, g: 255, b: 255 });
    });
    it("converts 3-digit hex", () => {
      expect(hexToRgb("#f00")).toEqual({ r: 255, g: 0, b: 0 });
      expect(hexToRgb("#fff")).toEqual({ r: 255, g: 255, b: 255 });
    });
    it("handles without #", () => {
      expect(hexToRgb("ff0000")).toEqual({ r: 255, g: 0, b: 0 });
    });
    it("returns null for invalid", () => {
      expect(hexToRgb("xyz")).toBeNull();
      expect(hexToRgb("")).toBeNull();
    });
  });

  describe("rgbToHex", () => {
    it("converts RGB to hex", () => {
      expect(rgbToHex(255, 0, 0)).toBe("#ff0000");
      expect(rgbToHex(0, 255, 0)).toBe("#00ff00");
      expect(rgbToHex(0, 0, 0)).toBe("#000000");
    });
    it("clamps out-of-range values", () => {
      expect(rgbToHex(300, -10, 128)).toBe("#ff0080");
    });
  });

  describe("rgbToHsl / hslToRgb roundtrip", () => {
    it("converts red", () => {
      const hsl = rgbToHsl(255, 0, 0);
      expect(hsl.h).toBeCloseTo(0, 1);
      expect(hsl.s).toBeCloseTo(1, 1);
      expect(hsl.l).toBeCloseTo(0.5, 1);
    });
    it("handles gray (no saturation)", () => {
      const hsl = rgbToHsl(128, 128, 128);
      expect(hsl.s).toBe(0);
    });
    it("roundtrips correctly", () => {
      const hsl = rgbToHsl(100, 150, 200);
      const rgb = hslToRgb(hsl.h, hsl.s, hsl.l);
      expect(rgb.r).toBeCloseTo(100, 0);
      expect(rgb.g).toBeCloseTo(150, 0);
      expect(rgb.b).toBeCloseTo(200, 0);
    });
  });

  describe("lighten / darken", () => {
    it("lightens colors", () => {
      const lighter = lighten("#800000", 50);
      const rgb = hexToRgb(lighter);
      expect(rgb!.r).toBeGreaterThan(128);
    });
    it("darkens colors", () => {
      const darker = darken("#ff8080", 50);
      const rgb = hexToRgb(darker);
      expect(rgb!.r).toBeLessThan(255);
    });
    it("handles invalid hex", () => {
      expect(lighten("invalid", 50)).toBe("invalid");
    });
  });

  describe("isLight / contrastColor", () => {
    it("white is light", () => {
      expect(isLight("#ffffff")).toBe(true);
      expect(contrastColor("#ffffff")).toBe("#000000");
    });
    it("black is dark", () => {
      expect(isLight("#000000")).toBe(false);
      expect(contrastColor("#000000")).toBe("#ffffff");
    });
  });

  describe("luminance", () => {
    it("white = 1", () => expect(luminance("#ffffff")).toBeCloseTo(1, 1));
    it("black = 0", () => expect(luminance("#000000")).toBe(0));
  });

  describe("contrastRatio", () => {
    it("black/white = 21", () => {
      expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 0);
    });
    it("same color = 1", () => {
      expect(contrastRatio("#ff0000", "#ff0000")).toBeCloseTo(1, 0);
    });
  });

  describe("mix", () => {
    it("mixes 50/50", () => {
      const mixed = mix("#ff0000", "#0000ff", 0.5);
      const rgb = hexToRgb(mixed);
      expect(rgb!.r).toBeCloseTo(128, -1);
      expect(rgb!.b).toBeCloseTo(128, -1);
    });
    it("weight 1 = first color", () => {
      expect(mix("#ff0000", "#0000ff", 1)).toBe("#ff0000");
    });
  });

  describe("opacity", () => {
    it("returns rgba string", () => {
      expect(opacity("#ff0000", 0.5)).toBe("rgba(255, 0, 0, 0.5)");
    });
    it("clamps alpha", () => {
      expect(opacity("#ff0000", 2)).toBe("rgba(255, 0, 0, 1)");
      expect(opacity("#ff0000", -1)).toBe("rgba(255, 0, 0, 0)");
    });
  });

  describe("randomColor", () => {
    it("generates valid hex colors", () => {
      for (let i = 0; i < 50; i++) {
        const c = randomColor();
        expect(c).toMatch(/^#[0-9a-f]{6}$/);
      }
    });
  });
});
