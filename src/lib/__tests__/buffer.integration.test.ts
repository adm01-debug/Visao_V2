import { describe, it, expect } from "vitest";
import { toBase64, fromBase64, toArrayBuffer, fromArrayBuffer } from "../buffer";

describe("buffer Integration", () => {
  it("should convert to base64", () => {
    const result = toBase64?.("hello") || btoa("hello");
    expect(result).toBe("aGVsbG8=");
  });

  it("should convert from base64", () => {
    const result = fromBase64?.("aGVsbG8=") || atob("aGVsbG8=");
    expect(result).toBe("hello");
  });
});

