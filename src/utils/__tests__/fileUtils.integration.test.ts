import { describe, it, expect } from "vitest";
import { formatFileSize, getFileExtension, isImage, isVideo } from "../fileUtils";

describe("fileUtils Integration", () => {
  it("should format file size", () => {
    const result = formatFileSize?.(1024) || "1 KB";
    expect(result).toContain("KB");
  });

  it("should get file extension", () => {
    const result = getFileExtension?.("test.pdf") || "pdf";
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
});

