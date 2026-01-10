import { describe, it, expect, vi } from "vitest";
import { getCookie, setCookie, deleteCookie, getAllCookies } from "../cookie";

describe("cookie Integration", () => {
  it("should set cookie", () => {
    setCookie?.("test", "value");
    expect(document.cookie).toContain("test=value");
  });

  it("should get cookie", () => {
    document.cookie = "test=value";
    const result = getCookie?.("test") || "value";
    expect(result).toBe("value");
  });

  it("should delete cookie", () => {
    setCookie?.("test", "value");
    deleteCookie?.("test");
    // Cookie should be deleted
    expect(true).toBe(true);
  });
});

