import { describe, it, expect, vi } from "vitest";
import { captureException, captureMessage } from "@/lib/errorTracking";

describe("lib/errorTracking", () => {
  describe("captureException", () => {
    it("logs errors", () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      captureException(new Error("test error"));
      expect(spy).toHaveBeenCalledWith("[ErrorTracking]", expect.any(Error), undefined);
      spy.mockRestore();
    });

    it("logs with context", () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      captureException(new Error("test"), { userId: "123" });
      expect(spy).toHaveBeenCalledWith("[ErrorTracking]", expect.any(Error), { userId: "123" });
      spy.mockRestore();
    });

    it("handles non-Error values", () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      captureException("string error");
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
  });

  describe("captureMessage", () => {
    it("logs info messages", () => {
      const spy = vi.spyOn(console, "info").mockImplementation(() => {});
      captureMessage("test info");
      expect(spy).toHaveBeenCalledWith("[ErrorTracking]", "test info");
      spy.mockRestore();
    });

    it("logs warning messages", () => {
      const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
      captureMessage("test warning", "warning");
      expect(spy).toHaveBeenCalledWith("[ErrorTracking]", "test warning");
      spy.mockRestore();
    });

    it("logs error messages", () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      captureMessage("test error", "error");
      expect(spy).toHaveBeenCalledWith("[ErrorTracking]", "test error");
      spy.mockRestore();
    });
  });
});
