import { describe, it, expect } from "vitest";
import { cn } from "../cn";

describe("cn", () => {
  it("should merge class names", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("should handle conditional classes", () => {
    expect(cn("foo", false && "bar", "baz")).toBe("foo baz");
  });

  it("should handle undefined values", () => {
    expect(cn("foo", undefined, "bar")).toBe("foo bar");
  });

  it("should handle null values", () => {
    expect(cn("foo", null, "bar")).toBe("foo bar");
  });

  it("should merge tailwind classes correctly", () => {
    expect(cn("px-2 py-1", "px-4")).toContain("px-4");
    expect(cn("px-2 py-1", "px-4")).toContain("py-1");
  });

  it("should handle empty strings", () => {
    expect(cn("foo", "", "bar")).toBe("foo bar");
  });

  it("should handle object notation", () => {
    expect(cn({ foo: true, bar: false })).toBe("foo");
  });

  it("should handle arrays", () => {
    expect(cn(["foo", "bar"])).toBe("foo bar");
  });
});
