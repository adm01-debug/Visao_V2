import { describe, it, expect } from "vitest";
import { KeyRotation } from "@/lib/keyRotation";

describe("KeyRotation", () => {
  it("getKey returns null for unknown id", () => {
    const kr = new KeyRotation();
    expect(kr.getKey("unknown")).toBeNull();
  });

  it("rotateExpired with no keys returns empty", () => {
    const kr = new KeyRotation();
    expect(kr.rotateExpired()).toEqual([]);
  });

  // Note: generateKey requires crypto.subtle.generateKey which is not fully available in jsdom
  // This documents a limitation of the test environment
  it("constructor creates empty key store", () => {
    const kr = new KeyRotation();
    expect(kr.getKey("any")).toBeNull();
  });
});
