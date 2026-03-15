import { describe, it, expect } from "vitest";
import { getMemoryInfo, forceGC } from "@/lib/memoryManager";

describe("memoryManager", () => {
  it("getMemoryInfo returns null in jsdom (no performance.memory)", () => {
    expect(getMemoryInfo()).toBeNull();
  });

  it("forceGC does not throw", () => {
    expect(() => forceGC()).not.toThrow();
  });
});
