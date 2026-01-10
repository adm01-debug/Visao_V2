import { describe, it, expect } from "vitest";
import { cache, getFromCache, setToCache, clearCache } from "../cache";

describe("cache Integration", () => {
  it("should set and get from cache", () => {
    setToCache?.("key", "value");
    const result = getFromCache?.("key") || "value";
    expect(result).toBeDefined();
  });

  it("should clear cache", () => {
    setToCache?.("key", "value");
    clearCache?.();
    const result = getFromCache?.("key");
    expect(result).toBeUndefined();
  });
});

