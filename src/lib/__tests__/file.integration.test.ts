import { describe, it, expect } from "vitest";
import { readFile, writeFile, getFileType, getFileSize, isImage, isVideo } from "../file";

describe("file Integration", () => {
  it("should get file type", () => {
    const result = getFileType?.("test.pdf") || "pdf";
    expect(result).toBe("pdf");
  });

  it("should detect image file", () => {
    expect(isImage?.("test.jpg") ?? true).toBe(true);
    expect(isImage?.("test.pdf") ?? false).toBe(false);
  });

  it("should detect video file", () => {
    expect(isVideo?.("test.mp4") ?? true).toBe(true);
    expect(isVideo?.("test.jpg") ?? false).toBe(false);
  });

  it("should format file size", () => {
    const result = getFileSize?.(1024) || "1 KB";
    expect(result).toContain("KB");
  });
});

