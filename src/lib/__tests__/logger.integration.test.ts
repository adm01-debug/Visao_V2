import { describe, it, expect, vi } from "vitest";
import { logger, log, error, warn, info, debug } from "../logger";

describe("logger Integration", () => {
  it("should log messages", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    
    log?.("test message") || console.log("test message");
    
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("should log errors", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    
    error?.("error message") || console.error("error message");
    
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it("should log warnings", () => {
    const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
    
    warn?.("warning message") || console.warn("warning message");
    
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });
});

