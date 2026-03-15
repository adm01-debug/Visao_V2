import { describe, it, expect } from "vitest";
import { ApiError, handleApiError, isNetworkError } from "@/lib/apiError";

describe("apiError", () => {
  describe("ApiError", () => {
    it("creates with message and status", () => {
      const e = new ApiError("Not Found", 404);
      expect(e.message).toBe("Not Found");
      expect(e.status).toBe(404);
      expect(e.name).toBe("ApiError");
    });
    it("creates with code", () => {
      const e = new ApiError("Forbidden", 403, "FORBIDDEN");
      expect(e.code).toBe("FORBIDDEN");
    });
    it("is instanceof Error", () => {
      expect(new ApiError("x", 500) instanceof Error).toBe(true);
    });
  });

  describe("handleApiError", () => {
    it("returns ApiError message", () => {
      expect(handleApiError(new ApiError("custom", 400))).toBe("custom");
    });
    it("returns Error message", () => {
      expect(handleApiError(new Error("oops"))).toBe("oops");
    });
    it("returns default for unknown", () => {
      expect(handleApiError(42)).toBe("Erro desconhecido");
    });
    it("returns default for null", () => {
      expect(handleApiError(null)).toBe("Erro desconhecido");
    });
    it("returns default for string", () => {
      expect(handleApiError("error")).toBe("Erro desconhecido");
    });
  });

  describe("isNetworkError", () => {
    it("true for Failed to fetch TypeError", () => {
      expect(isNetworkError(new TypeError("Failed to fetch"))).toBe(true);
    });
    it("false for other TypeError", () => {
      expect(isNetworkError(new TypeError("other"))).toBe(false);
    });
    it("false for regular Error", () => {
      expect(isNetworkError(new Error("Failed to fetch"))).toBe(false);
    });
    it("false for non-error", () => {
      expect(isNetworkError("Failed to fetch")).toBe(false);
    });
  });
});
