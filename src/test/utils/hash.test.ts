import { describe, it, expect } from "vitest";
import { simpleHash, hashCode, md5Like, fnv1a, objectHash } from "@/utils/hash";

describe("hash utils", () => {
  describe("simpleHash", () => {
    it("produces consistent hashes", () => {
      expect(simpleHash("test")).toBe(simpleHash("test"));
    });
    it("produces different hashes for different inputs", () => {
      expect(simpleHash("hello")).not.toBe(simpleHash("world"));
    });
    it("returns non-negative", () => {
      expect(simpleHash("anything")).toBeGreaterThanOrEqual(0);
    });
    it("handles empty string", () => {
      expect(simpleHash("")).toBe(0);
    });
    it("handles long strings", () => {
      const long = "a".repeat(10000);
      expect(typeof simpleHash(long)).toBe("number");
    });
  });

  describe("hashCode", () => {
    it("returns base36 string", () => {
      const result = hashCode("test");
      expect(typeof result).toBe("string");
      expect(/^[0-9a-z]+$/.test(result)).toBe(true);
    });
    it("is consistent", () => {
      expect(hashCode("abc")).toBe(hashCode("abc"));
    });
  });

  describe("md5Like", () => {
    it("returns 32-char hex", () => {
      const result = md5Like("test");
      expect(result).toHaveLength(32);
      expect(/^[0-9a-f]+$/.test(result)).toBe(true);
    });
  });

  describe("fnv1a", () => {
    it("produces consistent hashes", () => {
      expect(fnv1a("test")).toBe(fnv1a("test"));
    });
    it("produces different hashes", () => {
      expect(fnv1a("a")).not.toBe(fnv1a("b"));
    });
    it("returns unsigned 32-bit int", () => {
      expect(fnv1a("test")).toBeGreaterThanOrEqual(0);
      expect(fnv1a("test")).toBeLessThanOrEqual(4294967295);
    });
  });

  describe("objectHash", () => {
    it("hashes objects consistently", () => {
      expect(objectHash({ a: 1 })).toBe(objectHash({ a: 1 }));
    });
    it("different objects = different hashes", () => {
      expect(objectHash({ a: 1 })).not.toBe(objectHash({ a: 2 }));
    });
    it("hashes arrays", () => {
      expect(objectHash([1, 2, 3])).toBe(objectHash([1, 2, 3]));
    });
  });
});
