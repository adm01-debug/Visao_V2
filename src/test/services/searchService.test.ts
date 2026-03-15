import { describe, it, expect, vi } from "vitest";
import { searchService } from "@/services/searchService";

describe("SearchService", () => {
  const items = [
    { id: 1, name: "Camera Front", location: "Entrada" },
    { id: 2, name: "Camera Back", location: "Saída" },
    { id: 3, name: "Sensor Hall", location: "Hall" },
    { id: 4, name: "Camera Parking", location: "Estacionamento" },
  ];

  describe("search (exact)", () => {
    it("finds by substring", () => {
      const results = searchService.search(items, "Camera");
      expect(results).toHaveLength(3);
    });
    it("case insensitive by default", () => {
      const results = searchService.search(items, "camera");
      expect(results).toHaveLength(3);
    });
    it("case sensitive option", () => {
      const results = searchService.search(items, "camera", { caseSensitive: true });
      expect(results).toHaveLength(0);
    });
    it("returns all for empty query", () => {
      expect(searchService.search(items, "")).toHaveLength(4);
      expect(searchService.search(items, "  ")).toHaveLength(4);
    });
    it("limits results", () => {
      expect(searchService.search(items, "Camera", { limit: 2 })).toHaveLength(2);
    });
    it("searches specific fields", () => {
      const results = searchService.search(items, "Hall", { fields: ["location"] });
      expect(results).toHaveLength(1);
    });
    it("no results for non-match", () => {
      expect(searchService.search(items, "XYZ123")).toHaveLength(0);
    });
  });

  describe("search (fuzzy)", () => {
    it("finds fuzzy matches", () => {
      const results = searchService.search(items, "cmr", { fuzzy: true });
      // "cmr" fuzzy matches "Camera" (c...m...r)
      expect(results.length).toBeGreaterThan(0);
    });
    it("fuzzy with no match", () => {
      expect(searchService.search(items, "zzz", { fuzzy: true })).toHaveLength(0);
    });
  });

  describe("highlight", () => {
    it("highlights match", () => {
      expect(searchService.highlight("Hello World", "World")).toBe("Hello <mark>World</mark>");
    });
    it("case insensitive", () => {
      expect(searchService.highlight("Hello World", "world")).toBe("Hello <mark>World</mark>");
    });
    it("custom tag", () => {
      expect(searchService.highlight("Hello", "Hello", "strong")).toBe("<strong>Hello</strong>");
    });
    it("empty query returns original", () => {
      expect(searchService.highlight("Hello", "")).toBe("Hello");
    });
    it("escapes regex special chars", () => {
      expect(searchService.highlight("Price: $100", "$100")).toBe("Price: <mark>$100</mark>");
    });
  });

  describe("tokenize", () => {
    it("tokenizes text", () => {
      expect(searchService.tokenize("Hello World 123")).toEqual(["hello", "world", "123"]);
    });
    it("handles punctuation", () => {
      expect(searchService.tokenize("hello, world!")).toEqual(["hello", "world"]);
    });
    it("handles empty", () => {
      expect(searchService.tokenize("")).toEqual([]);
    });
  });
});
