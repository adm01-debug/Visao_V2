import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { setItem, getItem, removeItem, clear, hasItem } from "@/lib/encryptedStorage";

describe("encryptedStorage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("setItem and getItem roundtrip", () => {
    setItem("test", { name: "John", age: 30 });
    const result = getItem<{ name: string; age: number }>("test");
    expect(result).toEqual({ name: "John", age: 30 });
  });

  it("getItem returns null for missing key", () => {
    expect(getItem("nonexistent")).toBeNull();
  });

  it("removeItem deletes key", () => {
    setItem("del", "value");
    removeItem("del");
    expect(getItem("del")).toBeNull();
  });

  it("clear removes only prefixed keys", () => {
    setItem("a", 1);
    setItem("b", 2);
    localStorage.setItem("other_key", "keep");
    clear();
    expect(getItem("a")).toBeNull();
    expect(getItem("b")).toBeNull();
    expect(localStorage.getItem("other_key")).toBe("keep");
  });

  it("hasItem returns true when exists", () => {
    setItem("exists", true);
    expect(hasItem("exists")).toBe(true);
  });

  it("hasItem returns false when missing", () => {
    expect(hasItem("missing")).toBe(false);
  });

  it("TTL expiry returns null after expiry", () => {
    vi.useFakeTimers();
    setItem("ttl", "temp", 1000);
    vi.advanceTimersByTime(1001);
    expect(getItem("ttl")).toBeNull();
    vi.useRealTimers();
  });

  it("TTL not expired returns value", () => {
    vi.useFakeTimers();
    setItem("ttl2", "alive", 5000);
    vi.advanceTimersByTime(1000);
    expect(getItem("ttl2")).toBe("alive");
    vi.useRealTimers();
  });

  it("handles string values", () => {
    setItem("str", "hello world");
    expect(getItem("str")).toBe("hello world");
  });

  it("handles array values", () => {
    setItem("arr", [1, 2, 3]);
    expect(getItem("arr")).toEqual([1, 2, 3]);
  });

  it("handles corrupted data gracefully", () => {
    localStorage.setItem("visao_corrupt", "not-base64-!!!");
    expect(getItem("corrupt")).toBeNull();
  });

  // SECURITY GAP: "encryption" is just base64 encoding, not real encryption
  it("SECURITY GAP: data is only base64 encoded, not truly encrypted", () => {
    setItem("secret", "password123");
    const stored = localStorage.getItem("visao_secret");
    expect(stored).not.toBeNull();
    // Can be decoded with atob
    const decoded = decodeURIComponent(atob(stored!));
    expect(decoded).toContain("password123");
  });
});
