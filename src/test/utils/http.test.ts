import { describe, it, expect } from "vitest";
import { HttpError, isHttpError, buildQueryString, parseQueryString } from "@/utils/http";

describe("http utils", () => {
  describe("HttpError", () => {
    it("creates with status and text", () => {
      const err = new HttpError(404, "Not Found");
      expect(err.status).toBe(404);
      expect(err.statusText).toBe("Not Found");
      expect(err.message).toBe("HTTP 404: Not Found");
      expect(err.name).toBe("HttpError");
    });
    it("is instanceof Error", () => {
      expect(new HttpError(500, "ISE")).toBeInstanceOf(Error);
    });
  });

  describe("isHttpError", () => {
    it("true for HttpError", () => expect(isHttpError(new HttpError(400, "Bad"))).toBe(true));
    it("false for Error", () => expect(isHttpError(new Error("nope"))).toBe(false));
    it("false for string", () => expect(isHttpError("nope")).toBe(false));
    it("false for null", () => expect(isHttpError(null)).toBe(false));
  });

  describe("buildQueryString", () => {
    it("builds from params", () => {
      const qs = buildQueryString({ a: "1", b: 2, c: true });
      expect(qs).toContain("a=1");
      expect(qs).toContain("b=2");
      expect(qs).toContain("c=true");
    });
    it("skips null/undefined", () => {
      expect(buildQueryString({ a: null, b: undefined, c: "ok" })).toBe("c=ok");
    });
    it("handles empty", () => {
      expect(buildQueryString({})).toBe("");
    });
  });

  describe("parseQueryString", () => {
    it("parses query string", () => {
      expect(parseQueryString("a=1&b=2")).toEqual({ a: "1", b: "2" });
    });
    it("handles empty", () => {
      expect(parseQueryString("")).toEqual({});
    });
    it("handles encoded", () => {
      expect(parseQueryString("name=hello%20world")).toEqual({ name: "hello world" });
    });
  });
});
