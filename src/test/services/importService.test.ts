import { describe, it, expect } from "vitest";
import { importService } from "@/services/importService";

describe("importService", () => {
  it("importJSON parses JSON file", async () => {
    const file = new File(['{"name":"test","value":42}'], "data.json", { type: "application/json" });
    const result = await importService.importJSON<{ name: string; value: number }>(file);
    expect(result.name).toBe("test");
    expect(result.value).toBe(42);
  });

  it("importCSV parses CSV file", async () => {
    const csv = 'name,age\nAlice,30\nBob,25';
    const file = new File([csv], "data.csv", { type: "text/csv" });
    const result = await importService.importCSV(file);
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("Alice");
    expect(result[0].age).toBe("30");
  });

  it("importCSV with empty file returns empty array", async () => {
    const file = new File([""], "empty.csv", { type: "text/csv" });
    const result = await importService.importCSV(file);
    expect(result).toHaveLength(0);
  });

  it("importCSV handles quoted values", async () => {
    const csv = 'name,bio\n"Alice","Hello, world"';
    const file = new File([csv], "quoted.csv", { type: "text/csv" });
    const result = await importService.importCSV(file);
    expect(result[0].name).toBe("Alice");
  });

  it("importText reads plain text", async () => {
    const file = new File(["Hello World"], "readme.txt", { type: "text/plain" });
    const result = await importService.importText(file);
    expect(result).toBe("Hello World");
  });

  it("validateFileType accepts valid types", () => {
    const file = new File([""], "photo.jpg", { type: "image/jpeg" });
    expect(importService.validateFileType(file, ["image/jpeg", "image/png"])).toBe(true);
  });

  it("validateFileType rejects invalid types", () => {
    const file = new File([""], "script.js", { type: "text/javascript" });
    expect(importService.validateFileType(file, ["image/jpeg"])).toBe(false);
  });

  it("validateFileSize accepts within limit", () => {
    const file = new File(["x".repeat(100)], "small.txt");
    expect(importService.validateFileSize(file, 1000)).toBe(true);
  });

  it("validateFileSize rejects over limit", () => {
    const file = new File(["x".repeat(1000)], "big.txt");
    expect(importService.validateFileSize(file, 100)).toBe(false);
  });
});
