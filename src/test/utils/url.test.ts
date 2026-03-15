import { describe, it, expect } from "vitest";
import {
  isAbsoluteUrl, isRelativeUrl, joinUrl, getBasename, getDirname,
  getExtension, removeExtension, getOrigin, getHostname, getProtocol,
  getPort, getPathname, getHash, removeHash, isValidUrl, normalizeUrl,
  isSameOrigin,
} from "@/utils/url";

describe("url utils", () => {
  describe("isAbsoluteUrl / isRelativeUrl", () => {
    it("detects absolute URLs", () => {
      expect(isAbsoluteUrl("https://example.com")).toBe(true);
      expect(isAbsoluteUrl("http://localhost")).toBe(true);
      expect(isAbsoluteUrl("//cdn.example.com")).toBe(true);
      expect(isAbsoluteUrl("/path")).toBe(false);
      expect(isAbsoluteUrl("relative")).toBe(false);
    });
    it("detects relative URLs", () => {
      expect(isRelativeUrl("/path")).toBe(true);
      expect(isRelativeUrl("https://x.com")).toBe(false);
    });
  });

  describe("joinUrl", () => {
    it("joins URL parts", () => {
      expect(joinUrl("https://api.com", "v1", "users")).toBe("https://api.com/v1/users");
      expect(joinUrl("/api/", "/v1/", "/test")).toBe("/api/v1/test");
    });
  });

  describe("getBasename / getDirname / getExtension", () => {
    it("extracts parts", () => {
      expect(getBasename("https://example.com/path/file.txt")).toBe("file.txt");
      expect(getDirname("https://example.com/path/file.txt")).toBe("/path");
      expect(getExtension("https://example.com/file.txt")).toBe("txt");
      expect(getExtension("https://example.com/file")).toBe("");
    });
  });

  describe("removeExtension", () => {
    it("removes extension", () => {
      expect(removeExtension("https://example.com/file.txt")).toBe("https://example.com/file");
      expect(removeExtension("noext")).toBe("noext");
    });
  });

  describe("getOrigin / getHostname / getProtocol / getPort", () => {
    const url = "https://example.com:8080/path";
    it("extracts origin", () => expect(getOrigin(url)).toBe("https://example.com:8080"));
    it("extracts hostname", () => expect(getHostname(url)).toBe("example.com"));
    it("extracts protocol", () => expect(getProtocol(url)).toBe("https"));
    it("extracts port", () => expect(getPort(url)).toBe("8080"));
    it("handles invalid", () => {
      expect(getOrigin("invalid")).toBe("");
      expect(getHostname("invalid")).toBe("");
    });
  });

  describe("getPathname", () => {
    it("extracts pathname", () => {
      expect(getPathname("https://example.com/path/to/page")).toBe("/path/to/page");
      expect(getPathname("/relative/path")).toBe("/relative/path");
    });
  });

  describe("getHash / removeHash", () => {
    it("handles hash", () => {
      expect(getHash("https://example.com/page#section")).toBe("section");
      expect(getHash("https://example.com/page")).toBe("");
      expect(removeHash("https://example.com/page#section")).toBe("https://example.com/page");
    });
  });

  describe("isValidUrl", () => {
    it("validates URLs", () => {
      expect(isValidUrl("https://example.com")).toBe(true);
      expect(isValidUrl("not a url")).toBe(false);
    });
  });

  describe("normalizeUrl", () => {
    it("normalizes URLs", () => {
      expect(normalizeUrl("https://example.com/path/")).toBe("https://example.com/path");
      expect(normalizeUrl("https://example.com//double//slashes")).toContain("example.com");
    });
  });

  describe("isSameOrigin", () => {
    it("compares origins", () => {
      expect(isSameOrigin("https://a.com/x", "https://a.com/y")).toBe(true);
      expect(isSameOrigin("https://a.com", "https://b.com")).toBe(false);
    });
  });
});
