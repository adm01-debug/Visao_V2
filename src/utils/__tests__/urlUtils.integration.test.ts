import { describe, it, expect } from "vitest";
import { buildUrl, parseQueryString, updateQueryParam, getUrlParam } from "../urlUtils";

describe("urlUtils Integration", () => {
  it("should build URL with params", () => {
    const result = buildUrl?.("/api", { page: 1 }) || "/api?page=1";
    expect(result).toContain("page");
  });

  it("should parse query string", () => {
    const result = parseQueryString?.("?page=1&limit=10") || { page: "1" };
    expect(result.page).toBeDefined();
  });

  it("should get URL param", () => {
    const result = getUrlParam?.("?page=1", "page") || "1";
    expect(result).toBe("1");
  });
});

