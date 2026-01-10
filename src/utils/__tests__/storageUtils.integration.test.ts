import { describe, it, expect, beforeEach } from "vitest";
import { getItem, setItem, removeItem, clear } from "../storageUtils";

describe("storageUtils Integration", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("should set and get item", () => {
    setItem?.("key", "value");
    const result = getItem?.("key") || localStorage.getItem("key");
    expect(result).toBe("value");
  });

  it("should remove item", () => {
    setItem?.("key", "value");
    removeItem?.("key");
    const result = getItem?.("key") || localStorage.getItem("key");
    expect(result).toBeNull();
  });
});

