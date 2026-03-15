import { describe, it, expect } from "vitest";
import { AppError, handleError, isAppError } from "@/lib/errorHandler";

describe("errorHandler", () => {
  describe("AppError", () => {
    it("creates with defaults", () => {
      const e = new AppError("fail");
      expect(e.message).toBe("fail");
      expect(e.code).toBe("UNKNOWN_ERROR");
      expect(e.statusCode).toBe(500);
      expect(e.name).toBe("AppError");
    });
    it("creates with custom code and status", () => {
      const e = new AppError("not found", "NOT_FOUND", 404);
      expect(e.code).toBe("NOT_FOUND");
      expect(e.statusCode).toBe(404);
    });
    it("is instanceof Error", () => {
      expect(new AppError("x") instanceof Error).toBe(true);
    });
  });

  describe("handleError", () => {
    it("returns AppError as-is", () => {
      const e = new AppError("x", "CODE", 400);
      expect(handleError(e)).toBe(e);
    });
    it("wraps regular Error", () => {
      const result = handleError(new Error("oops"));
      expect(result).toBeInstanceOf(AppError);
      expect(result.message).toBe("oops");
    });
    it("wraps unknown value", () => {
      const result = handleError("string error");
      expect(result).toBeInstanceOf(AppError);
      expect(result.message).toBe("An unknown error occurred");
    });
    it("wraps null", () => {
      expect(handleError(null).message).toBe("An unknown error occurred");
    });
    it("wraps undefined", () => {
      expect(handleError(undefined).message).toBe("An unknown error occurred");
    });
    it("wraps number", () => {
      expect(handleError(42).message).toBe("An unknown error occurred");
    });
  });

  describe("isAppError", () => {
    it("true for AppError", () => { expect(isAppError(new AppError("x"))).toBe(true); });
    it("false for Error", () => { expect(isAppError(new Error("x"))).toBe(false); });
    it("false for string", () => { expect(isAppError("x")).toBe(false); });
    it("false for null", () => { expect(isAppError(null)).toBe(false); });
  });
});
