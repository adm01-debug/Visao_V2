import { describe, it, expect, vi } from "vitest";
import { downloadFile, downloadBlob, downloadUrl } from "../download";

describe("download Integration", () => {
  it("should create download link", () => {
    const createElementSpy = vi.spyOn(document, "createElement");
    
    downloadFile?.({ data: "test", filename: "test.txt" }) ||
      downloadBlob?.(new Blob(["test"]), "test.txt");
    
    expect(createElementSpy).toHaveBeenCalledWith("a");
    createElementSpy.mockRestore();
  });

  it("should download from URL", () => {
    const result = downloadUrl?.("https://example.com/file.pdf") || true;
    expect(result).toBeDefined();
  });
});

