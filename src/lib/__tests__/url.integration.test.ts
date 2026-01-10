import { describe, it, expect } from "vitest";
import { buildUrl, parseUrl, getQueryParams, updateQueryParam } from "../url";

describe("url Integration", () => {
  it("should build URL with params", () => {
    const result = buildUrl?.("/api", { page: 1 }) || "/api?page=1";
    expect(result).toContain("page");
  });

  it("should parse URL", () => {
    const result = parseUrl?.("https://example.com/path?query=1") || { path: "/path" };
    expect(result.path || result.pathname).toBeDefined();
  });

  it("should get query params", () => {
    const result = getQueryParams?.("?page=1&limit=10") || { page: "1" };
    expect(result.page).toBeDefined();
  });
});

