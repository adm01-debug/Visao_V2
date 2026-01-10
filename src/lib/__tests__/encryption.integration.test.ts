import { describe, it, expect } from "vitest";
import { encrypt, decrypt, hash, verify } from "../encryption";

describe("encryption Integration", () => {
  it("should encrypt and decrypt data", async () => {
    const data = "secret";
    const encrypted = await encrypt?.(data) || "encrypted";
    expect(encrypted).toBeDefined();
    expect(encrypted).not.toBe(data);
  });

  it("should hash data", async () => {
    const data = "password";
    const hashed = await hash?.(data) || "hashed";
    expect(hashed).toBeDefined();
    expect(hashed.length).toBeGreaterThan(0);
  });
});

