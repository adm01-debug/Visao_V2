import { describe, it, expect } from "vitest";
import { generateSrcSet } from "@/lib/imageOptimizer";

describe("imageOptimizer", () => {
  describe("generateSrcSet", () => {
    it("generates srcset string", () => {
      const result = generateSrcSet("https://img.com/photo.jpg", [320, 640, 1280]);
      expect(result).toContain("320w");
      expect(result).toContain("640w");
      expect(result).toContain("1280w");
      expect(result).toContain("?w=320");
    });

    it("single width", () => {
      const result = generateSrcSet("/img.jpg", [800]);
      expect(result).toBe("/img.jpg?w=800 800w");
    });

    it("empty widths returns empty string", () => {
      expect(generateSrcSet("/img.jpg", [])).toBe("");
    });
  });
});
