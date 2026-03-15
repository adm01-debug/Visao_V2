import { describe, it, expect } from "vitest";
import { importService } from "@/services/importService";

describe("importService", () => {
  // File.text() not available in jsdom, test validation methods only

  it("validateFileType accepts valid types", () => {
    const file = new File([""], "photo.jpg", { type: "image/jpeg" });
    expect(importService.validateFileType(file, ["image/jpeg", "image/png"])).toBe(true);
  });

  it("validateFileType rejects invalid types", () => {
    const file = new File([""], "script.js", { type: "text/javascript" });
    expect(importService.validateFileType(file, ["image/jpeg"])).toBe(false);
  });

  it("validateFileType with empty allowed list", () => {
    const file = new File([""], "file.txt", { type: "text/plain" });
    expect(importService.validateFileType(file, [])).toBe(false);
  });

  it("validateFileSize accepts within limit", () => {
    const file = new File(["x".repeat(100)], "small.txt");
    expect(importService.validateFileSize(file, 1000)).toBe(true);
  });

  it("validateFileSize rejects over limit", () => {
    const file = new File(["x".repeat(1000)], "big.txt");
    expect(importService.validateFileSize(file, 100)).toBe(false);
  });

  it("validateFileSize exact boundary", () => {
    const content = "x".repeat(50);
    const file = new File([content], "exact.txt");
    expect(importService.validateFileSize(file, file.size)).toBe(true);
  });

  it("multiple validations combined", () => {
    const file = new File(["data"], "img.png", { type: "image/png" });
    const typeOk = importService.validateFileType(file, ["image/png"]);
    const sizeOk = importService.validateFileSize(file, 1000000);
    expect(typeOk && sizeOk).toBe(true);
  });
});
