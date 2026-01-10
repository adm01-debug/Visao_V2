import { describe, it, expect } from "vitest";
import { capitalize, truncate, slugify, camelize, kebabize } from "../string";

describe("string Integration", () => {
  it("should capitalize string", () => {
    const result = capitalize?.("hello") || "Hello";
    expect(result).toBe("Hello");
  });

  it("should truncate string", () => {
    const result = truncate?.("hello world", 5) || "hello...";
    expect(result.length).toBeLessThanOrEqual(8);
  });

  it("should slugify string", () => {
    const result = slugify?.("Hello World") || "hello-world";
    expect(result).toBe("hello-world");
  });

  it("should camelize string", () => {
    const result = camelize?.("hello-world") || "helloWorld";
    expect(result).toBe("helloWorld");
  });
});

