import { describe, it, expect } from "vitest";
import { parse, stringify, toObjects } from "@/lib/csv";

describe("csv utils", () => {
  describe("parse", () => {
    it("parses simple CSV", () => {
      expect(parse("a,b,c\n1,2,3")).toEqual([["a", "b", "c"], ["1", "2", "3"]]);
    });
    it("parses single row", () => {
      expect(parse("a,b,c")).toEqual([["a", "b", "c"]]);
    });
    it("parses with custom delimiter", () => {
      expect(parse("a;b;c", ";")).toEqual([["a", "b", "c"]]);
    });
    it("handles empty cells", () => {
      expect(parse("a,,c")).toEqual([["a", "", "c"]]);
    });
    it("handles empty string", () => {
      expect(parse("")).toEqual([[""]]);
    });
  });

  describe("stringify", () => {
    it("stringifies array", () => {
      expect(stringify([["a", "b"], ["1", "2"]])).toBe("a,b\n1,2");
    });
    it("custom delimiter", () => {
      expect(stringify([["a", "b"]], ";")).toBe("a;b");
    });
    it("handles empty", () => {
      expect(stringify([])).toBe("");
    });
  });

  describe("toObjects", () => {
    it("converts to objects using headers", () => {
      const result = toObjects<{ name: string; age: string }>("name,age\nJohn,30\nJane,25");
      expect(result).toEqual([
        { name: "John", age: "30" },
        { name: "Jane", age: "25" },
      ]);
    });
    it("handles single row", () => {
      const result = toObjects("a,b");
      expect(result).toEqual([]);
    });
    it("custom delimiter", () => {
      const result = toObjects("name;age\nJohn;30", ";");
      expect(result).toEqual([{ name: "John", age: "30" }]);
    });
  });

  describe("roundtrip", () => {
    it("parse → stringify preserves data", () => {
      const csv = "a,b,c\n1,2,3\n4,5,6";
      expect(stringify(parse(csv))).toBe(csv);
    });
  });
});
