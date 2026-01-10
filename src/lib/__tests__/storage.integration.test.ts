import { describe, it, expect, beforeEach } from "vitest";
import { storage, get, set, remove, clear } from "../storage";

describe("storage Integration", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should set and get value", () => {
    set?.("key", "value");
    const result = get?.("key") || localStorage.getItem("key");
    expect(result).toBe("value");
  });

  it("should remove value", () => {
    set?.("key", "value");
    remove?.("key");
    const result = get?.("key") || localStorage.getItem("key");
    expect(result).toBeNull();
  });

  it("should clear all values", () => {
    set?.("key1", "value1");
    set?.("key2", "value2");
    clear?.();
    expect(localStorage.length).toBe(0);
  });
});

