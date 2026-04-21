import { describe, it, expect } from "vitest";
import { logger } from "@/lib/logger";

describe("logger", () => {
  it("debug does not throw", () => {
    expect(() => logger.debug("debug msg")).not.toThrow();
  });
  it("info does not throw", () => {
    expect(() => logger.info("info msg")).not.toThrow();
  });
  it("warn does not throw", () => {
    expect(() => logger.warn("warn msg")).not.toThrow();
  });
  it("error does not throw", () => {
    expect(() => logger.error("error msg")).not.toThrow();
  });
  it("accepts data parameter", () => {
    expect(() => logger.info("with data", { key: "value" })).not.toThrow();
  });
  it("accepts undefined data", () => {
    expect(() => logger.info("no data", undefined)).not.toThrow();
  });
});
