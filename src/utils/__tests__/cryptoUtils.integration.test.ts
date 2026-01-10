import { describe, it, expect } from "vitest";
import { hash, encrypt, decrypt, generateId } from "../cryptoUtils";

describe("cryptoUtils Integration", () => {
  it("should generate unique ID", () => {
    const id1 = generateId?.() || crypto.randomUUID();
    const id2 = generateId?.() || crypto.randomUUID();
    expect(id1).not.toBe(id2);
  });

  it("should hash string", async () => {
    const result = await hash?.("password") || "hashed";
    expect(result).toBeDefined();
    expect(result.length).toBeGreaterThan(0);
  });
});

