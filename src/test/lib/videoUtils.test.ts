import { describe, it, expect } from "vitest";
import { formatDuration, parseTimecode, calculateBitrate, estimateFileSize, getVideoResolution, calculateAspectRatio } from "@/lib/videoUtils";

describe("videoUtils", () => {
  describe("formatDuration", () => {
    it("formats seconds only", () => { expect(formatDuration(45)).toBe("0:45"); });
    it("formats minutes and seconds", () => { expect(formatDuration(125)).toBe("2:05"); });
    it("formats hours", () => { expect(formatDuration(3661)).toBe("1:01:01"); });
    it("zero seconds", () => { expect(formatDuration(0)).toBe("0:00"); });
    it("exact hour", () => { expect(formatDuration(3600)).toBe("1:00:00"); });
  });

  describe("parseTimecode", () => {
    it("parses H:M:S", () => { expect(parseTimecode("1:30:00")).toBe(5400); });
    it("parses M:S", () => { expect(parseTimecode("2:30")).toBe(150); });
    it("parses single number", () => { expect(parseTimecode("45")).toBe(45); });
    it("parses 0:00", () => { expect(parseTimecode("0:00")).toBe(0); });
  });

  describe("calculateBitrate", () => {
    it("calculates kbps", () => {
      // 1MB file, 10s duration = (1000000*8)/10/1000 = 800 kbps
      expect(calculateBitrate(1000000, 10)).toBe(800);
    });
  });

  describe("estimateFileSize", () => {
    it("estimates in bytes", () => {
      // 800kbps, 10s = (800*1000*10)/8 = 1000000
      expect(estimateFileSize(800, 10)).toBe(1000000);
    });
  });

  describe("getVideoResolution", () => {
    it("4K", () => { expect(getVideoResolution(3840, 2160)).toBe("4K"); });
    it("1080p", () => { expect(getVideoResolution(1920, 1080)).toBe("1080p"); });
    it("720p", () => { expect(getVideoResolution(1280, 720)).toBe("720p"); });
    it("480p", () => { expect(getVideoResolution(854, 480)).toBe("480p"); });
    it("custom small", () => { expect(getVideoResolution(640, 480)).toBe("640x480"); });
  });

  describe("calculateAspectRatio", () => {
    it("16:9", () => { expect(calculateAspectRatio(1920, 1080)).toBe("16:9"); });
    it("4:3", () => { expect(calculateAspectRatio(1024, 768)).toBe("4:3"); });
    it("1:1", () => { expect(calculateAspectRatio(500, 500)).toBe("1:1"); });
    it("21:9", () => { expect(calculateAspectRatio(2520, 1080)).toBe("7:3"); }); // GCD simplifies
  });
});
