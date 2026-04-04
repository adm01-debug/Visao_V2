import { describe, it, expect, vi } from "vitest";
import { captureException, captureMessage } from "@/lib/errorTracking";

describe("lib/errorTracking", () => {
  describe("captureException", () => {
    it("logs errors", () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      captureException(new Error("test error"));
      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining("[ERROR]"),
        expect.stringContaining("color:"),
        "[ErrorTracking]",
        expect.objectContaining({ error: "test error" })
      );
      spy.mockRestore();
    });

    it("logs with context", () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      captureException(new Error("test"), { userId: "123" });
      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining("[ERROR]"),
        expect.stringContaining("color:"),
        "[ErrorTracking]",
        expect.objectContaining({ error: "test", userId: "123" })
      );
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
      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining("[INFO]"),
        expect.stringContaining("color:"),
        "[ErrorTracking]",
        "test info"
      );
      spy.mockRestore();
    });

    it("logs warning messages", () => {
      const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
      captureMessage("test warning", "warning");
      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining("[WARN]"),
        expect.stringContaining("color:"),
        "[ErrorTracking]",
        "test warning"
      );
      spy.mockRestore();
    });

    it("logs error messages", () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      captureMessage("test error", "error");
      expect(spy).toHaveBeenCalledWith(
        expect.stringContaining("[ERROR]"),
        expect.stringContaining("color:"),
        "[ErrorTracking]",
        "test error"
      );
      spy.mockRestore();
    });
  });
});
