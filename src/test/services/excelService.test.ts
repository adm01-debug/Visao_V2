import { describe, it, expect } from "vitest";
import { excelService } from "@/services/excelService";

describe("excelService", () => {
  describe("parseCSV", () => {
    it("parses simple CSV", () => {
      const result = excelService.parseCSV("name,age\nAlice,30\nBob,25");
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe("Alice");
      expect(result[0].age).toBe("30");
      expect(result[1].name).toBe("Bob");
    });

    it("empty CSV returns empty array", () => {
      expect(excelService.parseCSV("")).toEqual([]);
    });

    it("header only returns empty array", () => {
      expect(excelService.parseCSV("name,age")).toEqual([]);
    });

    it("handles quoted fields with commas", () => {
      const csv = 'name,bio\nAlice,"Hello, World"\nBob,"Nice, right?"';
      const result = excelService.parseCSV(csv);
      expect(result[0].bio).toBe("Hello, World");
    });

    it("handles escaped quotes", () => {
      const csv = 'name,quote\nAlice,"She said ""hi"""\nBob,simple';
      const result = excelService.parseCSV(csv);
      expect(result[0].quote).toBe('She said "hi"');
    });

    it("handles empty fields", () => {
      const csv = "a,b,c\n1,,3\n,2,";
      const result = excelService.parseCSV(csv);
      expect(result[0].b).toBe("");
      expect(result[1].a).toBe("");
    });

    it("handles many rows", () => {
      const rows = Array.from({ length: 100 }, (_, i) => `item${i},${i}`);
      const csv = "name,value\n" + rows.join("\n");
      expect(excelService.parseCSV(csv)).toHaveLength(100);
    });
  });
});
