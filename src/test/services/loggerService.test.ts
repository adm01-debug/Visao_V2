import { describe, it, expect, vi, beforeEach } from "vitest";
import { logger } from "@/services/loggerService";

describe("LoggerService", () => {
  beforeEach(() => {
    logger.clearBuffer();
    logger.setConfig({ minLevel: "debug", enableConsole: false });
  });

  describe("log levels", () => {
    it("debug adds to buffer", () => {
      logger.debug("debug msg");
      expect(logger.getBuffer()).toHaveLength(1);
      expect(logger.getBuffer()[0].level).toBe("debug");
    });
    it("info adds to buffer", () => {
      logger.info("info msg");
      expect(logger.getBuffer()[0].level).toBe("info");
    });
    it("warn adds to buffer", () => {
      logger.warn("warn msg");
      expect(logger.getBuffer()[0].level).toBe("warn");
    });
    it("error adds to buffer", () => {
      logger.error("error msg");
      expect(logger.getBuffer()[0].level).toBe("error");
    });
    it("fatal adds to buffer", () => {
      logger.fatal("fatal msg");
      expect(logger.getBuffer()[0].level).toBe("fatal");
    });
  });

  describe("minLevel filtering", () => {
    it("filters below minLevel", () => {
      logger.setConfig({ minLevel: "warn", enableConsole: false });
      logger.debug("skip");
      logger.info("skip");
      logger.warn("keep");
      logger.error("keep");
      expect(logger.getBuffer()).toHaveLength(2);
    });
  });

  describe("data and context", () => {
    it("stores data", () => {
      logger.info("msg", { userId: "123" });
      expect(logger.getBuffer()[0].data).toEqual({ userId: "123" });
    });
    it("stores context", () => {
      logger.info("msg", undefined, "AuthModule");
      expect(logger.getBuffer()[0].context).toBe("AuthModule");
    });
  });

  describe("buffer management", () => {
    it("clearBuffer empties buffer", () => {
      logger.info("a");
      logger.info("b");
      logger.clearBuffer();
      expect(logger.getBuffer()).toHaveLength(0);
    });
    it("getBuffer returns copy", () => {
      logger.info("msg");
      const buf = logger.getBuffer();
      buf.push({} as any);
      expect(logger.getBuffer()).toHaveLength(1);
    });
  });

  describe("console output", () => {
    it("logs to console when enabled", () => {
      const spy = vi.spyOn(console, "log").mockImplementation(() => {});
      logger.setConfig({ enableConsole: true, minLevel: "info" });
      logger.info("console test");
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
    it("error/fatal use console.error", () => {
      const spy = vi.spyOn(console, "error").mockImplementation(() => {});
      logger.setConfig({ enableConsole: true, minLevel: "debug" });
      logger.error("err test");
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
    it("warn uses console.warn", () => {
      const spy = vi.spyOn(console, "warn").mockImplementation(() => {});
      logger.setConfig({ enableConsole: true, minLevel: "debug" });
      logger.warn("warn test");
      expect(spy).toHaveBeenCalled();
      spy.mockRestore();
    });
  });
});
