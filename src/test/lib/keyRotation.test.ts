import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { KeyRotation } from "@/lib/keyRotation";

describe("KeyRotation", () => {
  it("generateKey returns string id", async () => {
    const kr = new KeyRotation();
    const id = await kr.generateKey();
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
  });

  it("getKey returns key after generation", async () => {
    const kr = new KeyRotation();
    const id = await kr.generateKey();
    const key = kr.getKey(id);
    expect(key).not.toBeNull();
  });

  it("getKey returns null for unknown id", () => {
    const kr = new KeyRotation();
    expect(kr.getKey("unknown")).toBeNull();
  });

  it("rotateExpired with fresh keys returns empty", async () => {
    const kr = new KeyRotation();
    await kr.generateKey();
    expect(kr.rotateExpired()).toEqual([]);
  });

  it("multiple keys are independent", async () => {
    const kr = new KeyRotation();
    const id1 = await kr.generateKey();
    const id2 = await kr.generateKey();
    expect(id1).not.toBe(id2);
    expect(kr.getKey(id1)).not.toBeNull();
    expect(kr.getKey(id2)).not.toBeNull();
  });
});
