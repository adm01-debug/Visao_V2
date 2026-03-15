import { describe, it, expect } from "vitest";
import { isValidImageType, base64ToBlob } from "@/utils/image";

describe("image utils", () => {
  describe("isValidImageType", () => {
    it("accepts jpeg", () => {
      expect(isValidImageType({ type: "image/jpeg" } as File)).toBe(true);
    });
    it("accepts png", () => {
      expect(isValidImageType({ type: "image/png" } as File)).toBe(true);
    });
    it("accepts gif", () => {
      expect(isValidImageType({ type: "image/gif" } as File)).toBe(true);
    });
    it("accepts webp", () => {
      expect(isValidImageType({ type: "image/webp" } as File)).toBe(true);
    });
    it("rejects bmp", () => {
      expect(isValidImageType({ type: "image/bmp" } as File)).toBe(false);
    });
    it("rejects text/plain", () => {
      expect(isValidImageType({ type: "text/plain" } as File)).toBe(false);
    });
    it("rejects application/pdf", () => {
      expect(isValidImageType({ type: "application/pdf" } as File)).toBe(false);
    });
    it("rejects empty type", () => {
      expect(isValidImageType({ type: "" } as File)).toBe(false);
    });
  });

  describe("base64ToBlob", () => {
    it("converts base64 to blob", () => {
      // Simple 1-byte base64
      const blob = base64ToBlob("AA==");
      expect(blob).toBeInstanceOf(Blob);
      expect(blob.type).toBe("image/jpeg");
    });
    it("uses custom mime type", () => {
      const blob = base64ToBlob("AA==", "image/png");
      expect(blob.type).toBe("image/png");
    });
    it("handles data URI prefix", () => {
      const blob = base64ToBlob("data:image/png;base64,AA==");
      expect(blob).toBeInstanceOf(Blob);
    });
    it("produces correct size", () => {
      // "SGVsbG8=" = "Hello" = 5 bytes
      const blob = base64ToBlob("SGVsbG8=");
      expect(blob.size).toBe(5);
    });
  });
});
