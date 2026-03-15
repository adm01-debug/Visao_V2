import { describe, it, expect } from "vitest";
import {
  AppError, ValidationError, NetworkError, AuthError, NotFoundError,
  ForbiddenError, ConflictError, TimeoutError,
  isAppError, isValidationError, isNetworkError, isAuthError,
  getErrorMessage, getErrorCode, tryAsync, trySync, fromHttpStatus,
} from "@/utils/error";

describe("error utils", () => {
  describe("AppError", () => {
    it("creates with message and code", () => {
      const e = new AppError("test", "VALIDATION_ERROR");
      expect(e.message).toBe("test");
      expect(e.code).toBe("VALIDATION_ERROR");
      expect(e.name).toBe("AppError");
      expect(e.timestamp).toBeInstanceOf(Date);
    });
    it("toJSON", () => {
      const e = new AppError("msg", "AUTH_ERROR", { field: "email" });
      const json = e.toJSON();
      expect(json.message).toBe("msg");
      expect(json.code).toBe("AUTH_ERROR");
      expect(json.details).toEqual({ field: "email" });
    });
  });

  describe("subclasses", () => {
    it("ValidationError", () => {
      const e = new ValidationError("bad", "email");
      expect(e.name).toBe("ValidationError");
      expect(e.field).toBe("email");
      expect(e.code).toBe("VALIDATION_ERROR");
    });
    it("NetworkError", () => {
      const e = new NetworkError("timeout", 504);
      expect(e.status).toBe(504);
      expect(e.code).toBe("NETWORK_ERROR");
    });
    it("AuthError", () => {
      const e = new AuthError();
      expect(e.message).toBe("Não autorizado");
    });
    it("NotFoundError", () => {
      const e = new NotFoundError("Câmera");
      expect(e.message).toBe("Câmera não encontrado");
    });
    it("ForbiddenError", () => {
      expect(new ForbiddenError().message).toBe("Acesso negado");
    });
    it("ConflictError", () => {
      expect(new ConflictError().code).toBe("CONFLICT");
    });
    it("TimeoutError", () => {
      expect(new TimeoutError().code).toBe("TIMEOUT");
    });
  });

  describe("type guards", () => {
    it("isAppError", () => {
      expect(isAppError(new AppError("x", "UNKNOWN"))).toBe(true);
      expect(isAppError(new Error("x"))).toBe(false);
      expect(isAppError("string")).toBe(false);
    });
    it("isValidationError", () => {
      expect(isValidationError(new ValidationError("x"))).toBe(true);
      expect(isValidationError(new AppError("x", "UNKNOWN"))).toBe(false);
    });
    it("isNetworkError", () => {
      expect(isNetworkError(new NetworkError("x"))).toBe(true);
    });
    it("isAuthError", () => {
      expect(isAuthError(new AuthError())).toBe(true);
    });
  });

  describe("getErrorMessage", () => {
    it("from AppError", () => expect(getErrorMessage(new AppError("err", "UNKNOWN"))).toBe("err"));
    it("from Error", () => expect(getErrorMessage(new Error("native"))).toBe("native"));
    it("from string", () => expect(getErrorMessage("str")).toBe("str"));
    it("from unknown", () => expect(getErrorMessage(42)).toBe("Erro desconhecido"));
  });

  describe("getErrorCode", () => {
    it("from AppError", () => expect(getErrorCode(new AuthError())).toBe("AUTH_ERROR"));
    it("from unknown", () => expect(getErrorCode("str")).toBe("UNKNOWN"));
  });

  describe("tryAsync", () => {
    it("returns [value, null] on success", async () => {
      const [val, err] = await tryAsync(() => Promise.resolve(42));
      expect(val).toBe(42);
      expect(err).toBeNull();
    });
    it("returns [null, error] on failure", async () => {
      const [val, err] = await tryAsync(() => Promise.reject(new Error("boom")));
      expect(val).toBeNull();
      expect(err?.message).toBe("boom");
    });
    it("wraps non-Error throws", async () => {
      const [, err] = await tryAsync(() => Promise.reject("string error"));
      expect(err).toBeInstanceOf(Error);
    });
  });

  describe("trySync", () => {
    it("returns [value, null] on success", () => {
      const [val, err] = trySync(() => 42);
      expect(val).toBe(42);
      expect(err).toBeNull();
    });
    it("returns [null, error] on failure", () => {
      const [val, err] = trySync(() => { throw new Error("sync boom"); });
      expect(val).toBeNull();
      expect(err?.message).toBe("sync boom");
    });
  });

  describe("fromHttpStatus", () => {
    it("401 → AuthError", () => expect(fromHttpStatus(401)).toBeInstanceOf(AuthError));
    it("403 → ForbiddenError", () => expect(fromHttpStatus(403)).toBeInstanceOf(ForbiddenError));
    it("404 → NotFoundError", () => expect(fromHttpStatus(404)).toBeInstanceOf(NotFoundError));
    it("409 → ConflictError", () => expect(fromHttpStatus(409)).toBeInstanceOf(ConflictError));
    it("500 → NetworkError", () => expect(fromHttpStatus(500)).toBeInstanceOf(NetworkError));
    it("custom message", () => expect(fromHttpStatus(401, "Custom").message).toBe("Custom"));
    it("unknown status → NetworkError", () => expect(fromHttpStatus(418)).toBeInstanceOf(NetworkError));
  });
});
