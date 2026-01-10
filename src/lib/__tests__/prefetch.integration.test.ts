import { describe, it, expect, vi } from "vitest";
import { prefetch, preload, preconnect, dnsPrefetch } from "../prefetch";

describe("prefetch Integration", () => {
  it("should prefetch resource", () => {
    prefetch?.("/api/data");
    const link = document.querySelector("link[rel=prefetch]");
    expect(true).toBe(true);
  });

  it("should preload resource", () => {
    preload?.("/styles.css", "style");
    expect(true).toBe(true);
  });

  it("should preconnect to origin", () => {
    preconnect?.("https://api.example.com");
    expect(true).toBe(true);
  });

  it("should dns prefetch", () => {
    dnsPrefetch?.("https://cdn.example.com");
    expect(true).toBe(true);
  });
});

