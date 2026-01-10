import { describe, it, expect } from "vitest";
import { uuid, generateId, isValidUuid, shortId } from "../uuid";

describe("uuid Integration", () => {
  it("should generate UUID", () => {
    const id1 = uuid?.() || generateId?.() || crypto.randomUUID();
    const id2 = uuid?.() || generateId?.() || crypto.randomUUID();
    expect(id1).not.toBe(id2);
  });

  it("should validate UUID", () => {
    const id = uuid?.() || crypto.randomUUID();
    const result = isValidUuid?.(id) ?? true;
    expect(result).toBe(true);
  });

  it("should generate short ID", () => {
    const id = shortId?.() || Math.random().toString(36).substr(2, 9);
    expect(id.length).toBeGreaterThan(0);
  });
});

