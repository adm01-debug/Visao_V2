import { describe, it, expect } from "vitest";
import {
  parseQuery, stringifyQuery, getQueryParam, setQueryParam,
  removeQueryParam, mergeQueryParams, hasQueryParam, getQueryParams,
} from "@/utils/query";

describe("query utils", () => {
  describe("parseQuery", () => {
    it("parses simple query", () => {
      expect(parseQuery("?a=1&b=2")).toEqual({ a: "1", b: "2" });
    });
    it("parses without ?", () => {
      expect(parseQuery("a=1")).toEqual({ a: "1" });
    });
    it("handles duplicate keys as arrays", () => {
      expect(parseQuery("a=1&a=2")).toEqual({ a: ["1", "2"] });
    });
    it("handles empty", () => {
      expect(parseQuery("")).toEqual({});
    });
    it("handles encoded values", () => {
      expect(parseQuery("name=hello%20world")).toEqual({ name: "hello world" });
    });
  });

  describe("stringifyQuery", () => {
    it("stringifies simple params", () => {
      const result = stringifyQuery({ a: "1", b: 2 });
      expect(result).toContain("a=1");
      expect(result).toContain("b=2");
    });
    it("skips null/undefined", () => {
      expect(stringifyQuery({ a: null, b: undefined, c: "ok" })).toBe("c=ok");
    });
    it("handles arrays", () => {
      const result = stringifyQuery({ tags: ["a", "b"] });
      expect(result).toContain("tags=a");
      expect(result).toContain("tags=b");
    });
    it("handles boolean", () => {
      expect(stringifyQuery({ active: true })).toBe("active=true");
    });
  });

  describe("getQueryParam", () => {
    it("gets param from full URL", () => {
      expect(getQueryParam("http://example.com?x=42", "x")).toBe("42");
    });
    it("returns null for missing", () => {
      expect(getQueryParam("http://example.com?a=1", "b")).toBeNull();
    });
    it("works with relative URL", () => {
      expect(getQueryParam("/page?key=val", "key")).toBe("val");
    });
  });

  describe("setQueryParam", () => {
    it("sets new param on full URL", () => {
      const result = setQueryParam("http://example.com", "a", "1");
      expect(result).toContain("a=1");
    });
    it("overrides existing param", () => {
      const result = setQueryParam("http://example.com?a=1", "a", "2");
      expect(result).toContain("a=2");
      expect(result).not.toContain("a=1");
    });
    it("works with relative URL", () => {
      const result = setQueryParam("/page", "key", "val");
      expect(result).toContain("key=val");
    });
  });

  describe("removeQueryParam", () => {
    it("removes param", () => {
      const result = removeQueryParam("http://example.com?a=1&b=2", "a");
      expect(result).not.toContain("a=");
      expect(result).toContain("b=2");
    });
    it("handles missing param gracefully", () => {
      const result = removeQueryParam("http://example.com?a=1", "b");
      expect(result).toContain("a=1");
    });
  });

  describe("mergeQueryParams", () => {
    it("merges new params", () => {
      const result = mergeQueryParams("http://example.com?a=1", { b: 2 });
      expect(result).toContain("a=1");
      expect(result).toContain("b=2");
    });
    it("null removes param", () => {
      const result = mergeQueryParams("http://example.com?a=1&b=2", { a: null });
      expect(result).not.toContain("a=");
    });
  });

  describe("hasQueryParam", () => {
    it("returns true for existing", () => {
      expect(hasQueryParam("http://example.com?x=1", "x")).toBe(true);
    });
    it("returns false for missing", () => {
      expect(hasQueryParam("http://example.com?x=1", "y")).toBe(false);
    });
  });

  describe("getQueryParams", () => {
    it("returns all params", () => {
      expect(getQueryParams("http://example.com?a=1&b=2")).toEqual({ a: "1", b: "2" });
    });
    it("returns empty for no params", () => {
      expect(getQueryParams("http://example.com")).toEqual({});
    });
  });
});
