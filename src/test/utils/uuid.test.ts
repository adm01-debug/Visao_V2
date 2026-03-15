import { describe, it, expect } from "vitest";
import {
  uuid, shortId, nanoid, isUuid, isUuidv4, parseUuid,
  uuidToBuffer, bufferToUuid, nilUuid, isNilUuid, maxUuid,
  compareUuids, sortUuids,
} from "@/utils/uuid";

describe("uuid utils", () => {
  describe("uuid", () => {
    it("generates valid UUIDs", () => {
      const id = uuid();
      expect(isUuid(id)).toBe(true);
    });
    it("generates unique UUIDs", () => {
      const ids = new Set(Array.from({ length: 100 }, () => uuid()));
      expect(ids.size).toBe(100);
    });
  });

  describe("shortId", () => {
    it("generates correct length", () => {
      expect(shortId(8)).toHaveLength(8);
      expect(shortId(16)).toHaveLength(16);
      expect(shortId()).toHaveLength(8);
    });
    it("generates unique IDs", () => {
      const ids = new Set(Array.from({ length: 50 }, () => shortId(12)));
      expect(ids.size).toBe(50);
    });
  });

  describe("nanoid", () => {
    it("generates correct length", () => {
      expect(nanoid()).toHaveLength(21);
      expect(nanoid(10)).toHaveLength(10);
    });
  });

  describe("isUuid / isUuidv4", () => {
    it("validates UUIDs", () => {
      expect(isUuid("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
      expect(isUuid("not-a-uuid")).toBe(false);
      expect(isUuid("")).toBe(false);
    });
    it("validates v4 specifically", () => {
      expect(isUuidv4("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
      expect(isUuidv4("550e8400-e29b-31d4-a716-446655440000")).toBe(false); // v3
    });
  });

  describe("parseUuid", () => {
    it("parses valid UUID", () => {
      const parsed = parseUuid("550e8400-e29b-41d4-a716-446655440000");
      expect(parsed).not.toBeNull();
      expect(parsed!.version).toBe(4);
      expect(parsed!.variant).toBe("RFC4122");
    });
    it("returns null for invalid", () => {
      expect(parseUuid("not-valid")).toBeNull();
    });
  });

  describe("buffer conversion", () => {
    it("converts to/from buffer", () => {
      const id = "550e8400-e29b-41d4-a716-446655440000";
      const buffer = uuidToBuffer(id);
      expect(buffer).toHaveLength(16);
      expect(bufferToUuid(buffer)).toBe(id);
    });
  });

  describe("nil / max UUID", () => {
    it("identifies nil UUID", () => {
      expect(isNilUuid(nilUuid)).toBe(true);
      expect(isNilUuid("not-nil")).toBe(false);
    });
    it("maxUuid is all f's", () => {
      expect(maxUuid).toBe("ffffffff-ffff-ffff-ffff-ffffffffffff");
    });
  });

  describe("compareUuids / sortUuids", () => {
    it("compares UUIDs", () => {
      expect(compareUuids("aaa", "bbb")).toBeLessThan(0);
      expect(compareUuids("bbb", "aaa")).toBeGreaterThan(0);
      expect(compareUuids("aaa", "aaa")).toBe(0);
    });
    it("sorts UUIDs", () => {
      const sorted = sortUuids(["ccc", "aaa", "bbb"]);
      expect(sorted).toEqual(["aaa", "bbb", "ccc"]);
    });
  });
});
